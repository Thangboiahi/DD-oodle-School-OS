import { z } from "zod";

export const ASSIGNMENT_TYPES = [
  "homework",
  "classwork",
  "quiz",
  "project",
  "practical",
] as const;

export type AssignmentType = (typeof ASSIGNMENT_TYPES)[number];

export const SUBMISSION_MODES = ["online", "offline", "both"] as const;
export type SubmissionMode = (typeof SUBMISSION_MODES)[number];

export const EVALUATION_MODES = ["manual", "auto_mcq", "rubric"] as const;
export type EvaluationMode = (typeof EVALUATION_MODES)[number];

export const ASSIGNMENT_STATUSES = [
  "draft",
  "published",
  "closed",
  "archived",
] as const;

export type AssignmentStatus = (typeof ASSIGNMENT_STATUSES)[number];

export const SUBMISSION_CHANNELS = ["online", "offline_recorded"] as const;
export type SubmissionChannel = (typeof SUBMISSION_CHANNELS)[number];

export const SUBMISSION_STATUSES = [
  "assigned",
  "submitted",
  "late_submitted",
  "completed_offline",
  "evaluated",
  "resubmit_requested",
] as const;

export type SubmissionStatus = (typeof SUBMISSION_STATUSES)[number];

export function normalizeOptionalDueAt(
  value: string | null | undefined,
): { ok: true; value: string | null } | { ok: false; error: string } {
  if (value === null || value === undefined) {
    return { ok: true, value: null };
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return { ok: true, value: null };
  }
  const parsedMs = Date.parse(trimmed);
  if (Number.isNaN(parsedMs)) {
    return { ok: false, error: "Due date/time must be a valid ISO timestamp." };
  }
  return { ok: true, value: new Date(parsedMs).toISOString() };
}

export const objectiveQuestionSchema = z
  .object({
    id: z.string().trim().min(1).max(40),
    prompt: z.string().trim().min(3).max(500),
    options: z.array(z.string().trim().min(1).max(200)).min(2).max(6),
    correctOptionIndex: z.number().int().min(0),
    marks: z.number().positive().max(100),
  })
  .superRefine((data, ctx) => {
    if (data.correctOptionIndex >= data.options.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["correctOptionIndex"],
        message:
          "correctOptionIndex must refer to a valid option index within options.",
      });
    }
  });

export type ObjectiveQuestion = z.infer<typeof objectiveQuestionSchema>;

export interface SanitizedObjectiveQuestion {
  id: string;
  prompt: string;
  options: readonly string[];
  marks: number;
  correctOptionIndex?: number;
}

export const createAssignmentSchema = z
  .object({
    teachingGroupId: z.string().uuid(),
    syllabusItemId: z.string().uuid().nullable().optional(),
    title: z.string().trim().min(3).max(160),
    instructions: z.string().trim().min(5).max(5000),
    assignmentType: z.enum(ASSIGNMENT_TYPES),
    submissionMode: z.enum(SUBMISSION_MODES),
    evaluationMode: z.enum(EVALUATION_MODES),
    maxMarks: z.number().min(0).max(1000).nullable().optional(),
    dueAt: z.string().trim().max(64).nullable().optional(),
    allowLateSubmission: z.boolean().default(true),
    objectiveQuestions: z.array(objectiveQuestionSchema).max(50).default([]),
    initialStatus: z.enum(["draft", "published"]).default("draft"),
  })
  .superRefine((data, ctx) => {
    if (data.dueAt) {
      const normalized = normalizeOptionalDueAt(data.dueAt);
      if (!normalized.ok) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["dueAt"],
          message: normalized.error,
        });
      }
    }

    if (data.evaluationMode === "auto_mcq") {
      if (data.objectiveQuestions.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["objectiveQuestions"],
          message:
            "Auto-MCQ assignments require at least one objective question.",
        });
      }

      const seenIds = new Set<string>();
      let questionMarksSum = 0;
      for (const question of data.objectiveQuestions) {
        if (seenIds.has(question.id)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["objectiveQuestions"],
            message: `Duplicate objective question id "${question.id}".`,
          });
        }
        seenIds.add(question.id);
        questionMarksSum += question.marks;
      }

      if (
        data.maxMarks !== null &&
        data.maxMarks !== undefined &&
        data.maxMarks < questionMarksSum
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["maxMarks"],
          message: `maxMarks (${data.maxMarks}) cannot be less than total objective question marks (${questionMarksSum}).`,
        });
      }
    }
  });

export const transitionAssignmentStatusSchema = z.object({
  assignmentId: z.string().uuid(),
  targetStatus: z.enum(["published", "closed", "archived"]),
});

function isSafeStoragePath(raw: string): boolean {
  const trimmed = raw.trim();
  if (!trimmed) return true;
  if (
    trimmed.startsWith("/") ||
    trimmed.startsWith("\\") ||
    trimmed.includes("..") ||
    trimmed.includes("\\") ||
    /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)
  ) {
    return false;
  }
  return true;
}

export const submitStudentAssignmentSchema = z
  .object({
    assignmentId: z.string().uuid(),
    responseText: z.string().trim().max(5000).optional().default(""),
    objectiveAnswers: z
      .record(z.string().trim().min(1).max(40), z.number().int().min(0))
      .default({}),
    attachmentStoragePath: z
      .string()
      .trim()
      .max(500)
      .nullable()
      .optional(),
  })
  .superRefine((data, ctx) => {
    if (
      data.attachmentStoragePath &&
      !isSafeStoragePath(data.attachmentStoragePath)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["attachmentStoragePath"],
        message:
          "Attachment storage path must be a relative path inside the institution bucket without '..' traversal.",
      });
    }
  });

export const recordOfflineCompletionSchema = z.object({
  assignmentId: z.string().uuid(),
  studentEnrolmentId: z.string().uuid(),
  studentProfileId: z.string().uuid(),
  status: z.enum(["completed_offline", "evaluated"]),
  marksAwarded: z.number().min(0).max(1000).nullable().optional(),
  teacherRemarks: z.string().trim().max(2000).nullable().optional(),
});

export const evaluateSubmissionSchema = z.object({
  submissionId: z.string().uuid(),
  assignmentId: z.string().uuid(),
  status: z.enum(["evaluated", "resubmit_requested"]),
  marksAwarded: z.number().min(0).max(1000).nullable().optional(),
  teacherRemarks: z.string().trim().max(2000).nullable().optional(),
});
