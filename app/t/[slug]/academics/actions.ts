"use server";

import { revalidatePath } from "next/cache";
import type { RegistryActionState } from "@/components/registry/RegistryActionForm";
import {
  activateSession,
  addStudentToTeachingGroup,
  assignAcademicResponsibility,
  createDepartment,
  createGradeAndSection,
  createSession,
  createSubjectAndOffering,
  createTeachingGroup,
  enrolStudentInSession,
  enrolStudentInSubject,
  revokeAcademicResponsibility,
} from "@/server/academics/service";

function fieldString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function fieldBoolean(formData: FormData, key: string): boolean {
  return formData.get(key) === "on" || formData.get(key) === "true";
}

function revalidateAcademicsRoutes(slug: string, sectionId?: string) {
  const encoded = encodeURIComponent(slug);
  revalidatePath(`/t/${encoded}/academics`);
  revalidatePath(`/t/${encoded}/academics/teaching-groups`);
  revalidatePath(`/t/${encoded}/academics/allocations`);
  if (sectionId) {
    revalidatePath(`/t/${encoded}/academics/sections/${sectionId}`);
  }
}

export async function createSessionAction(
  slug: string,
  _prev: RegistryActionState,
  formData: FormData,
): Promise<RegistryActionState> {
  const res = await createSession(slug, {
    code: fieldString(formData, "code"),
    name: fieldString(formData, "name"),
    startsOn: fieldString(formData, "startsOn"),
    endsOn: fieldString(formData, "endsOn"),
  });
  if (!res.ok) return { status: "error", message: res.error };
  revalidateAcademicsRoutes(slug);
  return { status: "success", message: "Planned academic session created." };
}

export async function activateSessionAction(
  slug: string,
  sessionId: string,
  _prev: RegistryActionState,
): Promise<RegistryActionState> {
  void _prev;
  const res = await activateSession(slug, sessionId);
  if (!res.ok) return { status: "error", message: res.error };
  revalidateAcademicsRoutes(slug);
  return {
    status: "success",
    message: "Session activated cleanly and previous active session archived.",
  };
}

export async function createDepartmentAction(
  slug: string,
  _prev: RegistryActionState,
  formData: FormData,
): Promise<RegistryActionState> {
  const res = await createDepartment(slug, {
    code: fieldString(formData, "code"),
    name: fieldString(formData, "name"),
    departmentKind: fieldString(formData, "departmentKind") || "class_band",
    description: fieldString(formData, "description"),
  });
  if (!res.ok) return { status: "error", message: res.error };
  revalidateAcademicsRoutes(slug);
  return { status: "success", message: "Academic department created." };
}

export async function createGradeAndSectionAction(
  slug: string,
  sessionId: string,
  _prev: RegistryActionState,
  formData: FormData,
): Promise<RegistryActionState> {
  const res = await createGradeAndSection(slug, {
    sessionId,
    departmentId: fieldString(formData, "departmentId"),
    gradeCode: fieldString(formData, "gradeCode"),
    gradeName: fieldString(formData, "gradeName"),
    displayOrder: fieldString(formData, "displayOrder") || "0",
    sectionCode: fieldString(formData, "sectionCode"),
    sectionName: fieldString(formData, "sectionName"),
    roomLabel: fieldString(formData, "roomLabel"),
    capacity: fieldString(formData, "capacity"),
  });
  if (!res.ok) return { status: "error", message: res.error };
  revalidateAcademicsRoutes(slug, res.data.sectionId);
  return { status: "success", message: "Class and section saved." };
}

export async function createSubjectAndOfferingAction(
  slug: string,
  sessionId: string,
  _prev: RegistryActionState,
  formData: FormData,
): Promise<RegistryActionState> {
  const res = await createSubjectAndOffering(slug, {
    sessionId,
    gradeLevelId: fieldString(formData, "gradeLevelId"),
    subjectCode: fieldString(formData, "subjectCode"),
    subjectName: fieldString(formData, "subjectName"),
    boardSubjectCode: fieldString(formData, "boardSubjectCode"),
    category: fieldString(formData, "category") || "elective",
    streamId: fieldString(formData, "streamId"),
    isMandatory: fieldBoolean(formData, "isMandatory"),
    maxStudents: fieldString(formData, "maxStudents"),
  });
  if (!res.ok) return { status: "error", message: res.error };
  revalidateAcademicsRoutes(slug);
  return { status: "success", message: "Subject and session offering added." };
}

export async function enrolStudentInSessionAction(
  slug: string,
  sessionId: string,
  gradeLevelId: string,
  sectionId: string,
  _prev: RegistryActionState,
  formData: FormData,
): Promise<RegistryActionState> {
  const res = await enrolStudentInSession(slug, {
    sessionId,
    studentProfileId: fieldString(formData, "studentProfileId"),
    gradeLevelId,
    sectionId,
    streamId: fieldString(formData, "streamId"),
    rollNumber: fieldString(formData, "rollNumber"),
  });
  if (!res.ok) return { status: "error", message: res.error };
  revalidateAcademicsRoutes(slug, sectionId);
  return { status: "success", message: "Student enrolled in section." };
}

export async function enrolStudentInSubjectAction(
  slug: string,
  sessionId: string,
  sectionId: string,
  _prev: RegistryActionState,
  formData: FormData,
): Promise<RegistryActionState> {
  const res = await enrolStudentInSubject(slug, {
    sessionId,
    studentEnrolmentId: fieldString(formData, "studentEnrolmentId"),
    subjectOfferingId: fieldString(formData, "subjectOfferingId"),
    enrolmentKind: fieldString(formData, "enrolmentKind") || "elective",
  });
  if (!res.ok) return { status: "error", message: res.error };
  revalidateAcademicsRoutes(slug, sectionId);
  return { status: "success", message: "Subject elective linked to student." };
}

export async function createTeachingGroupAction(
  slug: string,
  sessionId: string,
  _prev: RegistryActionState,
  formData: FormData,
): Promise<RegistryActionState> {
  const res = await createTeachingGroup(slug, {
    sessionId,
    subjectOfferingId: fieldString(formData, "subjectOfferingId"),
    code: fieldString(formData, "code"),
    name: fieldString(formData, "name"),
    isCrossSection: fieldBoolean(formData, "isCrossSection"),
    venueLabel: fieldString(formData, "venueLabel"),
  });
  if (!res.ok) return { status: "error", message: res.error };
  revalidateAcademicsRoutes(slug);
  return { status: "success", message: "Teaching group created." };
}

export async function addStudentToTeachingGroupAction(
  slug: string,
  _prev: RegistryActionState,
  formData: FormData,
): Promise<RegistryActionState> {
  const res = await addStudentToTeachingGroup(slug, {
    teachingGroupId: fieldString(formData, "teachingGroupId"),
    studentEnrolmentId: fieldString(formData, "studentEnrolmentId"),
  });
  if (!res.ok) return { status: "error", message: res.error };
  revalidateAcademicsRoutes(slug);
  return {
    status: "success",
    message: "Student allocated to teaching group cleanly.",
  };
}

export async function assignAcademicResponsibilityAction(
  slug: string,
  sessionId: string,
  _prev: RegistryActionState,
  formData: FormData,
): Promise<RegistryActionState> {
  const assignmentType = fieldString(formData, "assignmentType");
  const res = await assignAcademicResponsibility(slug, {
    sessionId,
    personId: fieldString(formData, "personId"),
    assignmentType,
    departmentId:
      assignmentType === "hod" ? fieldString(formData, "departmentId") : undefined,
    sectionId:
      assignmentType === "class_teacher" ||
      assignmentType === "monitor" ||
      assignmentType === "monitress"
        ? fieldString(formData, "sectionId")
        : undefined,
    teachingGroupId:
      assignmentType === "subject_teacher"
        ? fieldString(formData, "teachingGroupId")
        : undefined,
    startsOn: fieldString(formData, "startsOn"),
    endsOn: fieldString(formData, "endsOn"),
  });
  if (!res.ok) return { status: "error", message: res.error };
  revalidateAcademicsRoutes(slug);
  return {
    status: "success",
    message: "Time-bound academic responsibility assigned and audited.",
  };
}

export async function revokeAcademicResponsibilityAction(
  slug: string,
  assignmentId: string,
  _prev: RegistryActionState,
): Promise<RegistryActionState> {
  void _prev;
  const res = await revokeAcademicResponsibility(slug, assignmentId);
  if (!res.ok) return { status: "error", message: res.error };
  revalidateAcademicsRoutes(slug);
  return {
    status: "success",
    message: "Academic assignment revoked cleanly.",
  };
}
