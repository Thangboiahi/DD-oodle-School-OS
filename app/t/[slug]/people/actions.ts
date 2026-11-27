"use server";

import { revalidatePath } from "next/cache";
import type { RegistryActionState } from "@/components/registry/RegistryActionForm";
import type { CustomFieldEntityType } from "@/lib/registry/schemas";
import {
  createAdmissionApplication,
  createStaffRecord,
  createStudentRecord,
  linkStudentGuardian,
  transitionAdmissionStatus,
  updateStudentLifecycle,
  upsertCustomFieldDefinition,
  upsertCustomFieldValue,
} from "@/server/registry/service";

function fieldString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function fieldBoolean(formData: FormData, key: string): boolean {
  return formData.get(key) === "on" || formData.get(key) === "true";
}

function revalidatePeopleRoutes(slug: string, studentId?: string) {
  const encoded = encodeURIComponent(slug);
  revalidatePath(`/t/${encoded}/people`);
  revalidatePath(`/t/${encoded}/people/staff`);
  revalidatePath(`/t/${encoded}/people/admissions`);
  revalidatePath(`/t/${encoded}/people/custom-fields`);
  if (studentId) {
    revalidatePath(`/t/${encoded}/people/students/${studentId}`);
  }
}

export async function createStudentAction(
  slug: string,
  _prevState: RegistryActionState,
  formData: FormData,
): Promise<RegistryActionState> {
  const result = await createStudentRecord(slug, {
    fullName: fieldString(formData, "fullName"),
    email: fieldString(formData, "email"),
    admissionNumber: fieldString(formData, "admissionNumber"),
    admissionDate: fieldString(formData, "admissionDate"),
    lifecycleStatus: fieldString(formData, "lifecycleStatus") || "active",
    dateOfBirth: fieldString(formData, "dateOfBirth"),
    gender: fieldString(formData, "gender"),
    bloodGroup: fieldString(formData, "bloodGroup"),
    addressLine: fieldString(formData, "addressLine"),
    emergencyContactName: fieldString(formData, "emergencyContactName"),
    emergencyContactPhone: fieldString(formData, "emergencyContactPhone"),
    penNumber: fieldString(formData, "penNumber"),
    apaarId: fieldString(formData, "apaarId"),
    externalIdVerificationStatus:
      fieldString(formData, "externalIdVerificationStatus") || "unverified",
  });

  if (!result.ok) {
    return { status: "error", message: result.error };
  }

  revalidatePeopleRoutes(slug, result.data.studentProfileId);
  return {
    status: "success",
    message: "Student profile created and recorded in audit history.",
  };
}

export async function updateStudentLifecycleAction(
  slug: string,
  studentProfileId: string,
  _prevState: RegistryActionState,
  formData: FormData,
): Promise<RegistryActionState> {
  const result = await updateStudentLifecycle(slug, {
    studentProfileId,
    lifecycleStatus: fieldString(formData, "lifecycleStatus"),
    reason: fieldString(formData, "reason"),
  });

  if (!result.ok) {
    return { status: "error", message: result.error };
  }

  revalidatePeopleRoutes(slug, studentProfileId);
  return {
    status: "success",
    message: "Student lifecycle state updated and audited.",
  };
}

export async function linkGuardianAction(
  slug: string,
  studentProfileId: string,
  _prevState: RegistryActionState,
  formData: FormData,
): Promise<RegistryActionState> {
  const result = await linkStudentGuardian(slug, {
    studentProfileId,
    guardianFullName: fieldString(formData, "guardianFullName"),
    guardianEmail: fieldString(formData, "guardianEmail"),
    relationship: fieldString(formData, "relationship"),
    isPrimary: fieldBoolean(formData, "isPrimary"),
    canViewAcademics: fieldBoolean(formData, "canViewAcademics"),
    canReceiveNotices: fieldBoolean(formData, "canReceiveNotices"),
    canPickup: fieldBoolean(formData, "canPickup"),
  });

  if (!result.ok) {
    return { status: "error", message: result.error };
  }

  revalidatePeopleRoutes(slug, studentProfileId);
  return {
    status: "success",
    message: "Guardian linked cleanly to student profile.",
  };
}

export async function createStaffAction(
  slug: string,
  _prevState: RegistryActionState,
  formData: FormData,
): Promise<RegistryActionState> {
  const result = await createStaffRecord(slug, {
    fullName: fieldString(formData, "fullName"),
    email: fieldString(formData, "email"),
    employeeCode: fieldString(formData, "employeeCode"),
    designation: fieldString(formData, "designation"),
    employmentType: fieldString(formData, "employmentType") || "full_time",
    lifecycleStatus: fieldString(formData, "lifecycleStatus") || "active",
    joiningDate: fieldString(formData, "joiningDate"),
    qualifications: fieldString(formData, "qualifications"),
    emergencyContactName: fieldString(formData, "emergencyContactName"),
    emergencyContactPhone: fieldString(formData, "emergencyContactPhone"),
  });

  if (!result.ok) {
    return { status: "error", message: result.error };
  }

  revalidatePeopleRoutes(slug);
  return {
    status: "success",
    message: "Staff profile created and recorded in audit history.",
  };
}

export async function createAdmissionAction(
  slug: string,
  _prevState: RegistryActionState,
  formData: FormData,
): Promise<RegistryActionState> {
  const result = await createAdmissionApplication(slug, {
    applicantFullName: fieldString(formData, "applicantFullName"),
    applicantEmail: fieldString(formData, "applicantEmail"),
    guardianFullName: fieldString(formData, "guardianFullName"),
    guardianPhone: fieldString(formData, "guardianPhone"),
    targetSessionLabel: fieldString(formData, "targetSessionLabel"),
    targetGradeCode: fieldString(formData, "targetGradeCode"),
    notes: fieldString(formData, "notes"),
  });

  if (!result.ok) {
    return { status: "error", message: result.error };
  }

  revalidatePeopleRoutes(slug);
  return {
    status: "success",
    message: "Admission enquiry logged.",
  };
}

export async function transitionAdmissionAction(
  slug: string,
  applicationId: string,
  _prevState: RegistryActionState,
  formData: FormData,
): Promise<RegistryActionState> {
  const result = await transitionAdmissionStatus(slug, {
    applicationId,
    nextStatus: fieldString(formData, "nextStatus"),
    admissionNumber: fieldString(formData, "admissionNumber"),
    notes: fieldString(formData, "notes"),
  });

  if (!result.ok) {
    return { status: "error", message: result.error };
  }

  revalidatePeopleRoutes(slug, result.data.studentProfileId);
  return {
    status: "success",
    message: result.data.studentProfileId
      ? "Applicant enrolled and Student Profile created without duplicating person identity."
      : "Admission application status updated.",
  };
}

export async function upsertCustomFieldDefinitionAction(
  slug: string,
  _prevState: RegistryActionState,
  formData: FormData,
): Promise<RegistryActionState> {
  const rawOptions = fieldString(formData, "options");
  const options = rawOptions
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

  const result = await upsertCustomFieldDefinition(slug, {
    entityType: fieldString(formData, "entityType") || "student",
    fieldKey: fieldString(formData, "fieldKey"),
    label: fieldString(formData, "label"),
    fieldGroup: fieldString(formData, "fieldGroup") || "general",
    dataType: fieldString(formData, "dataType") || "text",
    options,
    isRequired: fieldBoolean(formData, "isRequired"),
    sensitivityLevel: fieldString(formData, "sensitivityLevel") || "standard",
    isActive: true,
  });

  if (!result.ok) {
    return { status: "error", message: result.error };
  }

  revalidatePeopleRoutes(slug);
  return {
    status: "success",
    message: "Custom field definition saved.",
  };
}

export async function upsertCustomFieldValueAction(
  slug: string,
  definitionId: string,
  entityType: CustomFieldEntityType,
  entityId: string,
  _prevState: RegistryActionState,
  formData: FormData,
): Promise<RegistryActionState> {
  const result = await upsertCustomFieldValue(slug, {
    definitionId,
    entityType,
    entityId,
    rawValue: fieldString(formData, "value"),
  });

  if (!result.ok) {
    return { status: "error", message: result.error };
  }

  revalidatePeopleRoutes(
    slug,
    entityType === "student" ? entityId : undefined,
  );
  return {
    status: "success",
    message: "Custom field value updated.",
  };
}
