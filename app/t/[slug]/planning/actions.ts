"use server";

import { revalidatePath } from "next/cache";
import type { RegistryActionState } from "@/components/registry/RegistryActionForm";
import {
  createLearningResource,
  createLessonPlan,
  createSyllabusItem,
  transitionLearningResourceStatus,
  updateAcademicTermStatus,
  updateLessonPlanStatus,
  updateSyllabusItemProgress,
} from "@/server/planning/service";

function fieldString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function revalidatePlanningPaths(slug: string) {
  const encodedSlug = encodeURIComponent(slug);
  revalidatePath(`/t/${encodedSlug}/planning`);
  revalidatePath(`/t/${encodedSlug}/planning/lessons`);
  revalidatePath(`/t/${encodedSlug}/planning/resources`);
  revalidatePath(`/t/${encodedSlug}/planning/oversight`);
}

export async function createSyllabusItemAction(
  slug: string,
  _prev: RegistryActionState,
  formData: FormData,
): Promise<RegistryActionState> {
  void _prev;
  const res = await createSyllabusItem(slug, {
    subjectOfferingId: fieldString(formData, "subjectOfferingId"),
    termId: fieldString(formData, "termId") || null,
    parentItemId: fieldString(formData, "parentItemId") || null,
    itemKind: fieldString(formData, "itemKind"),
    code: fieldString(formData, "code"),
    title: fieldString(formData, "title"),
    description: fieldString(formData, "description"),
    sequenceNo: fieldString(formData, "sequenceNo") || "1",
    targetDate: fieldString(formData, "targetDate") || null,
    progressStatus: fieldString(formData, "progressStatus") || "not_started",
    delayReason: fieldString(formData, "delayReason"),
    carryForwardNotes: fieldString(formData, "carryForwardNotes"),
  });

  if (!res.ok) return { status: "error", message: res.error };
  revalidatePlanningPaths(slug);
  return {
    status: "success",
    message: "Syllabus item added cleanly.",
  };
}

export async function updateSyllabusProgressAction(
  slug: string,
  itemId: string,
  _prev: RegistryActionState,
  formData: FormData,
): Promise<RegistryActionState> {
  void _prev;
  const res = await updateSyllabusItemProgress(slug, {
    itemId,
    progressStatus: fieldString(formData, "progressStatus"),
    targetDate: fieldString(formData, "targetDate") || null,
    delayReason: fieldString(formData, "delayReason"),
    carryForwardNotes: fieldString(formData, "carryForwardNotes"),
  });

  if (!res.ok) return { status: "error", message: res.error };
  revalidatePlanningPaths(slug);
  return {
    status: "success",
    message: "Syllabus progress updated.",
  };
}

export async function updateTermStatusAction(
  slug: string,
  termId: string,
  _prev: RegistryActionState,
  formData: FormData,
): Promise<RegistryActionState> {
  void _prev;
  const res = await updateAcademicTermStatus(slug, {
    termId,
    status: fieldString(formData, "status"),
  });

  if (!res.ok) return { status: "error", message: res.error };
  revalidatePlanningPaths(slug);
  return {
    status: "success",
    message: `Term updated to ${res.data.status}.`,
  };
}

export async function createLessonPlanAction(
  slug: string,
  _prev: RegistryActionState,
  formData: FormData,
): Promise<RegistryActionState> {
  void _prev;
  const res = await createLessonPlan(slug, {
    teachingGroupId: fieldString(formData, "teachingGroupId"),
    syllabusItemId: fieldString(formData, "syllabusItemId") || null,
    plannedForDate: fieldString(formData, "plannedForDate"),
    weekLabel: fieldString(formData, "weekLabel"),
    title: fieldString(formData, "title"),
    learningObjectives: fieldString(formData, "learningObjectives"),
    teachingNotes: fieldString(formData, "teachingNotes"),
    status: fieldString(formData, "status") || "planned",
    carryForwardNotes: fieldString(formData, "carryForwardNotes"),
  });

  if (!res.ok) return { status: "error", message: res.error };
  revalidatePlanningPaths(slug);
  return {
    status: "success",
    message: "Lesson plan saved cleanly.",
  };
}

export async function updateLessonPlanStatusAction(
  slug: string,
  lessonPlanId: string,
  _prev: RegistryActionState,
  formData: FormData,
): Promise<RegistryActionState> {
  void _prev;
  const res = await updateLessonPlanStatus(slug, {
    lessonPlanId,
    status: fieldString(formData, "status"),
    carryForwardNotes: fieldString(formData, "carryForwardNotes"),
    teachingNotes: fieldString(formData, "teachingNotes"),
  });

  if (!res.ok) return { status: "error", message: res.error };
  revalidatePlanningPaths(slug);
  return {
    status: "success",
    message: `Lesson plan marked ${res.data.status}.`,
  };
}

export async function createLearningResourceAction(
  slug: string,
  _prev: RegistryActionState,
  formData: FormData,
): Promise<RegistryActionState> {
  void _prev;
  const res = await createLearningResource(slug, {
    subjectOfferingId: fieldString(formData, "subjectOfferingId"),
    teachingGroupId: fieldString(formData, "teachingGroupId") || null,
    syllabusItemId: fieldString(formData, "syllabusItemId") || null,
    title: fieldString(formData, "title"),
    description: fieldString(formData, "description"),
    resourceKind: fieldString(formData, "resourceKind"),
    externalUrl: fieldString(formData, "externalUrl") || null,
    storageBucket: fieldString(formData, "storageBucket"),
    storagePath: fieldString(formData, "storagePath"),
    visibility: fieldString(formData, "visibility") || "teaching_group",
    status: fieldString(formData, "status") || "published",
  });

  if (!res.ok) return { status: "error", message: res.error };
  revalidatePlanningPaths(slug);
  return {
    status: "success",
    message: "Learning resource recorded cleanly.",
  };
}

export async function transitionResourceStatusAction(
  slug: string,
  resourceId: string,
  targetStatus: "published" | "archived",
  _prev: RegistryActionState,
): Promise<RegistryActionState> {
  void _prev;
  const res = await transitionLearningResourceStatus(slug, {
    resourceId,
    targetStatus,
  });

  if (!res.ok) return { status: "error", message: res.error };
  revalidatePlanningPaths(slug);
  return {
    status: "success",
    message:
      targetStatus === "published"
        ? "Learning resource published."
        : "Learning resource archived.",
  };
}
