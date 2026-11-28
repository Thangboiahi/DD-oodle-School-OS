"use server";

import { revalidatePath } from "next/cache";
import type { RegistryActionState } from "@/components/registry/RegistryActionForm";
import {
  createAssignment,
  evaluateAssignmentSubmission,
  recordOfflineAssignmentCompletion,
  submitStudentAssignment,
  transitionAssignmentStatus,
} from "@/server/assignments/service";
import { createRecordComment } from "@/server/communication/service";

function formString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function formOptionalNumber(formData: FormData, key: string): number | null {
  const raw = formString(formData, key);
  if (!raw) return null;
  const num = Number(raw);
  return Number.isFinite(num) ? num : Number.NaN;
}

function revalidateAssignmentPaths(slug: string, assignmentId?: string) {
  revalidatePath(`/t/${slug}/assignments`);
  if (assignmentId) {
    revalidatePath(`/t/${slug}/assignments/${assignmentId}`);
  }
  revalidatePath(`/t/${slug}/handbook`);
}

export async function createAssignmentAction(
  slug: string,
  _prevState: RegistryActionState,
  formData: FormData,
): Promise<RegistryActionState> {
  const evaluationMode = formString(formData, "evaluationMode") || "manual";
  const questionsJsonRaw = formString(formData, "objectiveQuestionsJson");

  let objectiveQuestions: unknown[] = [];
  if (evaluationMode === "auto_mcq" || questionsJsonRaw.length > 0) {
    if (!questionsJsonRaw) {
      return {
        status: "error",
        message:
          "Provide a valid JSON array of objective questions for Auto-MCQ assignments.",
      };
    }
    try {
      const parsedJson = JSON.parse(questionsJsonRaw);
      if (!Array.isArray(parsedJson)) {
        return {
          status: "error",
          message: "Objective questions input must be a JSON array.",
        };
      }
      objectiveQuestions = parsedJson;
    } catch {
      return {
        status: "error",
        message: "Objective questions JSON could not be parsed.",
      };
    }
  }

  const maxMarks = formOptionalNumber(formData, "maxMarks");
  if (maxMarks !== null && Number.isNaN(maxMarks)) {
    return { status: "error", message: "Max marks must be a valid number." };
  }

  const result = await createAssignment(slug, {
    teachingGroupId: formString(formData, "teachingGroupId"),
    syllabusItemId: formString(formData, "syllabusItemId") || null,
    title: formString(formData, "title"),
    instructions: formString(formData, "instructions"),
    assignmentType: formString(formData, "assignmentType") || "homework",
    submissionMode: formString(formData, "submissionMode") || "both",
    evaluationMode,
    maxMarks,
    dueAt: formString(formData, "dueAt") || null,
    allowLateSubmission: formData.get("allowLateSubmission") === "on",
    objectiveQuestions,
    initialStatus: formString(formData, "initialStatus") || "draft",
  });

  if (!result.ok) {
    return { status: "error", message: result.error };
  }

  revalidateAssignmentPaths(slug, result.data.id);
  return {
    status: "success",
    message: "Assignment created and scoped to the selected teaching group.",
  };
}

export async function transitionAssignmentStatusAction(
  slug: string,
  assignmentId: string,
  targetStatus: "published" | "closed" | "archived",
  _prevState: RegistryActionState,
): Promise<RegistryActionState> {
  void _prevState;
  const result = await transitionAssignmentStatus(slug, {
    assignmentId,
    targetStatus,
  });

  if (!result.ok) {
    return { status: "error", message: result.error };
  }

  revalidateAssignmentPaths(slug, assignmentId);
  return {
    status: "success",
    message: `Assignment marked as "${result.data.status}".`,
  };
}

export async function submitStudentAssignmentAction(
  slug: string,
  assignmentId: string,
  _prevState: RegistryActionState,
  formData: FormData,
): Promise<RegistryActionState> {
  const objectiveAnswers: Record<string, number> = {};
  for (const [key, val] of formData.entries()) {
    if (key.startsWith("mcq_") && typeof val === "string") {
      const qId = key.slice(4);
      const parsedIndex = Number(val);
      if (qId && Number.isInteger(parsedIndex) && parsedIndex >= 0) {
        objectiveAnswers[qId] = parsedIndex;
      }
    }
  }

  const result = await submitStudentAssignment(slug, {
    assignmentId,
    responseText: formString(formData, "responseText"),
    objectiveAnswers,
    attachmentStoragePath:
      formString(formData, "attachmentStoragePath") || null,
  });

  if (!result.ok) {
    return { status: "error", message: result.error };
  }

  revalidateAssignmentPaths(slug, assignmentId);
  return {
    status: "success",
    message: result.data.quizScorePreview
      ? `Submitted (${result.data.status}). Auto-MCQ preliminary score: ${result.data.quizScorePreview.marksAwarded}/${result.data.quizScorePreview.totalMarks}.`
      : `Assignment submitted (${result.data.status}).`,
  };
}

export async function recordOfflineCompletionAction(
  slug: string,
  assignmentId: string,
  studentEnrolmentId: string,
  studentProfileId: string,
  _prevState: RegistryActionState,
  formData: FormData,
): Promise<RegistryActionState> {
  const marksAwarded = formOptionalNumber(formData, "marksAwarded");
  if (marksAwarded !== null && Number.isNaN(marksAwarded)) {
    return { status: "error", message: "Marks must be a valid number." };
  }

  const result = await recordOfflineAssignmentCompletion(slug, {
    assignmentId,
    studentEnrolmentId,
    studentProfileId,
    status: formString(formData, "status") || "completed_offline",
    marksAwarded,
    teacherRemarks: formString(formData, "teacherRemarks") || null,
  });

  if (!result.ok) {
    return { status: "error", message: result.error };
  }

  revalidateAssignmentPaths(slug, assignmentId);
  return {
    status: "success",
    message: "Offline notebook completion recorded.",
  };
}

export async function evaluateSubmissionAction(
  slug: string,
  assignmentId: string,
  submissionId: string,
  _prevState: RegistryActionState,
  formData: FormData,
): Promise<RegistryActionState> {
  const useAutoMcqScore = formString(formData, "useAutoMcqScore") === "1";
  const marksAwarded = formOptionalNumber(formData, "marksAwarded");
  if (!useAutoMcqScore && marksAwarded !== null && Number.isNaN(marksAwarded)) {
    return { status: "error", message: "Marks must be a valid number." };
  }

  const result = await evaluateAssignmentSubmission(
    slug,
    {
      assignmentId,
      submissionId,
      status: formString(formData, "status") || "evaluated",
      marksAwarded,
      teacherRemarks: formString(formData, "teacherRemarks") || null,
    },
    { useAutoMcqScore },
  );

  if (!result.ok) {
    return { status: "error", message: result.error };
  }

  revalidateAssignmentPaths(slug, assignmentId);
  return {
    status: "success",
    message: `Submission updated to "${result.data.status}".`,
  };
}

export async function createAssignmentCommentAction(
  slug: string,
  assignmentId: string,
  _prevState: RegistryActionState,
  formData: FormData,
): Promise<RegistryActionState> {
  const result = await createRecordComment(slug, {
    parentKind: "assignment",
    parentId: assignmentId,
    body: formString(formData, "body"),
    isInternalStaffNote: formData.get("isInternalStaffNote") === "on",
  });

  if (!result.ok) {
    return { status: "error", message: result.error };
  }

  revalidateAssignmentPaths(slug, assignmentId);
  return {
    status: "success",
    message: "Comment posted to assignment record.",
  };
}
