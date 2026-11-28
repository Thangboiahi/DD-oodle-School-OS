"use server";

import { revalidatePath } from "next/cache";
import type { RegistryActionState } from "@/components/registry/RegistryActionForm";
import {
  createCalendarEvent,
  createTimetable,
  createTimetablePeriod,
  createTimetableSlot,
  createTimetableSubstitution,
  createVenue,
  deleteTimetableSlot,
  transitionSubstitutionStatus,
  transitionTimetableStatus,
  updateCalendarEventStatus,
} from "@/server/timetable/service";

function fieldString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function revalidateTimetablePaths(slug: string) {
  const encodedSlug = encodeURIComponent(slug);
  revalidatePath(`/t/${encodedSlug}/timetable`);
  revalidatePath(`/t/${encodedSlug}/calendar`);
}

export async function createVenueAction(
  slug: string,
  _prev: RegistryActionState,
  formData: FormData,
): Promise<RegistryActionState> {
  void _prev;
  const res = await createVenue(slug, {
    code: fieldString(formData, "code"),
    name: fieldString(formData, "name"),
    venueKind: fieldString(formData, "venueKind"),
    capacity: fieldString(formData, "capacity") || null,
    building: fieldString(formData, "building"),
    floor: fieldString(formData, "floor"),
    isActive: formData.get("isActive") !== null,
  });

  if (!res.ok) return { status: "error", message: res.error };
  revalidateTimetablePaths(slug);
  return { status: "success", message: "Venue added cleanly." };
}

export async function createTimetablePeriodAction(
  slug: string,
  _prev: RegistryActionState,
  formData: FormData,
): Promise<RegistryActionState> {
  void _prev;
  const res = await createTimetablePeriod(slug, {
    code: fieldString(formData, "code"),
    label: fieldString(formData, "label"),
    periodKind: fieldString(formData, "periodKind"),
    sequenceNo: fieldString(formData, "sequenceNo") || "1",
    startTime: fieldString(formData, "startTime"),
    endTime: fieldString(formData, "endTime"),
  });

  if (!res.ok) return { status: "error", message: res.error };
  revalidateTimetablePaths(slug);
  return { status: "success", message: "Timetable period added cleanly." };
}

export async function createTimetableAction(
  slug: string,
  _prev: RegistryActionState,
  formData: FormData,
): Promise<RegistryActionState> {
  void _prev;
  const res = await createTimetable(slug, {
    termId: fieldString(formData, "termId") || null,
    code: fieldString(formData, "code"),
    name: fieldString(formData, "name"),
    versionNo: fieldString(formData, "versionNo") || "1",
    effectiveFrom: fieldString(formData, "effectiveFrom"),
    effectiveTo: fieldString(formData, "effectiveTo") || null,
    isOfflineCacheable: formData.get("isOfflineCacheable") !== null,
    initialStatus: fieldString(formData, "initialStatus") || "draft",
  });

  if (!res.ok) return { status: "error", message: res.error };
  revalidateTimetablePaths(slug);
  return { status: "success", message: "Timetable version created cleanly." };
}

export async function transitionTimetableStatusAction(
  slug: string,
  timetableId: string,
  targetStatus: "published" | "archived",
  _prev: RegistryActionState,
): Promise<RegistryActionState> {
  void _prev;
  const res = await transitionTimetableStatus(slug, {
    timetableId,
    targetStatus,
  });

  if (!res.ok) return { status: "error", message: res.error };
  revalidateTimetablePaths(slug);
  return {
    status: "success",
    message: `Timetable updated to ${res.data.status}.`,
  };
}

export async function createTimetableSlotAction(
  slug: string,
  _prev: RegistryActionState,
  formData: FormData,
): Promise<RegistryActionState> {
  void _prev;
  const res = await createTimetableSlot(slug, {
    timetableId: fieldString(formData, "timetableId"),
    dayOfWeek: fieldString(formData, "dayOfWeek"),
    periodId: fieldString(formData, "periodId"),
    teachingGroupId: fieldString(formData, "teachingGroupId") || null,
    sectionId: fieldString(formData, "sectionId") || null,
    teacherPersonId: fieldString(formData, "teacherPersonId") || null,
    venueId: fieldString(formData, "venueId") || null,
    notes: fieldString(formData, "notes"),
  });

  if (!res.ok) return { status: "error", message: res.error };
  revalidateTimetablePaths(slug);
  return { status: "success", message: "Timetable slot scheduled cleanly." };
}

export async function deleteTimetableSlotAction(
  slug: string,
  slotId: string,
  _prev: RegistryActionState,
): Promise<RegistryActionState> {
  void _prev;
  const res = await deleteTimetableSlot(slug, slotId);
  if (!res.ok) return { status: "error", message: res.error };
  revalidateTimetablePaths(slug);
  return { status: "success", message: "Draft timetable slot removed." };
}

export async function createSubstitutionAction(
  slug: string,
  _prev: RegistryActionState,
  formData: FormData,
): Promise<RegistryActionState> {
  void _prev;
  const res = await createTimetableSubstitution(slug, {
    timetableSlotId: fieldString(formData, "timetableSlotId"),
    substitutionDate: fieldString(formData, "substitutionDate"),
    substituteTeacherPersonId: fieldString(
      formData,
      "substituteTeacherPersonId",
    ),
    reason: fieldString(formData, "reason"),
  });

  if (!res.ok) return { status: "error", message: res.error };
  revalidateTimetablePaths(slug);
  return { status: "success", message: "Teacher substitution assigned." };
}

export async function transitionSubstitutionStatusAction(
  slug: string,
  substitutionId: string,
  targetStatus: "completed" | "cancelled",
  _prev: RegistryActionState,
): Promise<RegistryActionState> {
  void _prev;
  const res = await transitionSubstitutionStatus(slug, {
    substitutionId,
    targetStatus,
  });

  if (!res.ok) return { status: "error", message: res.error };
  revalidateTimetablePaths(slug);
  return {
    status: "success",
    message: `Substitution marked ${res.data.status}.`,
  };
}

export async function createCalendarEventAction(
  slug: string,
  _prev: RegistryActionState,
  formData: FormData,
): Promise<RegistryActionState> {
  void _prev;
  const res = await createCalendarEvent(slug, {
    termId: fieldString(formData, "termId") || null,
    scopeType: fieldString(formData, "scopeType"),
    departmentId: fieldString(formData, "departmentId") || null,
    sectionId: fieldString(formData, "sectionId") || null,
    eventKind: fieldString(formData, "eventKind"),
    title: fieldString(formData, "title"),
    description: fieldString(formData, "description"),
    startsOn: fieldString(formData, "startsOn"),
    endsOn: fieldString(formData, "endsOn"),
    isNonInstructional: formData.get("isNonInstructional") !== null,
    status: fieldString(formData, "status") || "published",
  });

  if (!res.ok) return { status: "error", message: res.error };
  revalidateTimetablePaths(slug);
  return { status: "success", message: "Calendar event recorded cleanly." };
}

export async function updateCalendarEventStatusAction(
  slug: string,
  eventId: string,
  targetStatus: "published" | "cancelled",
  _prev: RegistryActionState,
): Promise<RegistryActionState> {
  void _prev;
  const res = await updateCalendarEventStatus(slug, {
    eventId,
    targetStatus,
  });

  if (!res.ok) return { status: "error", message: res.error };
  revalidateTimetablePaths(slug);
  return {
    status: "success",
    message: `Calendar event ${res.data.status}.`,
  };
}
