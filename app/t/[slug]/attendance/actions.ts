"use server";

import { revalidatePath } from "next/cache";
import type { RegistryActionState } from "@/components/registry/RegistryActionForm";
import { normalizeAttendanceTimestamp } from "@/lib/attendance/rules";
import {
  correctSignedOffStaffAttendance,
  correctSignedOffStudentAttendance,
  recordPeriodAttendance,
  recordStaffDailyAttendance,
  recordStudentDailyRoll,
  signOffSectionDailyAttendance,
  updateAttendancePolicy,
  verifyOrSignOffStaffAttendance,
  verifySectionDailyAttendance,
} from "@/server/attendance/service";

function fieldString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function fieldBoolean(formData: FormData, key: string): boolean {
  return formData.get(key) === "on" || formData.get(key) === "true";
}

function revalidateAttendanceRoutes(slug: string) {
  const encoded = encodeURIComponent(slug);
  revalidatePath(`/t/${encoded}/attendance`);
  revalidatePath(`/t/${encoded}/attendance/periods`);
  revalidatePath(`/t/${encoded}/attendance/staff`);
  revalidatePath(`/t/${encoded}/attendance/ledger`);
}

export async function saveStudentDailyRollAction(
  slug: string,
  sectionId: string,
  attendanceDate: string,
  _prev: RegistryActionState,
  formData: FormData,
): Promise<RegistryActionState> {
  void _prev;
  const enrolmentIds = formData
    .getAll("enrolmentIds")
    .filter((v): v is string => typeof v === "string" && v.length > 0);

  const entries = enrolmentIds
    .map((enrolmentId) => {
      const studentProfileId = fieldString(formData, `profile_${enrolmentId}`);
      const status = fieldString(formData, `status_${enrolmentId}`);
      const remarks = fieldString(formData, `remarks_${enrolmentId}`);
      if (!studentProfileId || !status) return null;
      return {
        studentEnrolmentId: enrolmentId,
        studentProfileId,
        status,
        remarks,
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null);

  const res = await recordStudentDailyRoll(slug, {
    sectionId,
    attendanceDate,
    entries,
  });

  if (!res.ok) return { status: "error", message: res.error };
  revalidateAttendanceRoutes(slug);
  return {
    status: "success",
    message: `Saved daily attendance roll for ${res.data.savedCount} student(s) on ${attendanceDate}.`,
  };
}

export async function verifySectionAttendanceAction(
  slug: string,
  sectionId: string,
  attendanceDate: string,
  _prev: RegistryActionState,
): Promise<RegistryActionState> {
  void _prev;
  const res = await verifySectionDailyAttendance(slug, {
    sectionId,
    attendanceDate,
  });

  if (!res.ok) return { status: "error", message: res.error };
  revalidateAttendanceRoutes(slug);
  return {
    status: "success",
    message: `Verified ${res.data.verifiedCount} daily attendance row(s).`,
  };
}

export async function signOffSectionAttendanceAction(
  slug: string,
  sectionId: string,
  attendanceDate: string,
  _prev: RegistryActionState,
): Promise<RegistryActionState> {
  void _prev;
  const res = await signOffSectionDailyAttendance(slug, {
    sectionId,
    attendanceDate,
  });

  if (!res.ok) return { status: "error", message: res.error };
  revalidateAttendanceRoutes(slug);
  return {
    status: "success",
    message: `Signed off ${res.data.signedOffCount} daily attendance row(s).`,
  };
}

export async function correctStudentAttendanceAction(
  slug: string,
  _prev: RegistryActionState,
  formData: FormData,
): Promise<RegistryActionState> {
  void _prev;
  const res = await correctSignedOffStudentAttendance(slug, {
    attendanceId: fieldString(formData, "attendanceId"),
    newStatus: fieldString(formData, "newStatus"),
    correctionReason: fieldString(formData, "correctionReason"),
    remarks: fieldString(formData, "remarks"),
  });

  if (!res.ok) return { status: "error", message: res.error };
  revalidateAttendanceRoutes(slug);
  return {
    status: "success",
    message: `Recorded audited post-sign-off correction (#${res.data.correctionCount}).`,
  };
}

export async function savePeriodAttendanceAction(
  slug: string,
  teachingGroupId: string,
  attendanceDate: string,
  periodCode: string,
  _prev: RegistryActionState,
  formData: FormData,
): Promise<RegistryActionState> {
  void _prev;
  const enrolmentIds = formData
    .getAll("enrolmentIds")
    .filter((v): v is string => typeof v === "string" && v.length > 0);

  const entries = enrolmentIds
    .map((enrolmentId) => {
      const studentProfileId = fieldString(formData, `profile_${enrolmentId}`);
      const status = fieldString(formData, `status_${enrolmentId}`);
      const remarks = fieldString(formData, `remarks_${enrolmentId}`);
      if (!studentProfileId || !status) return null;
      return {
        studentEnrolmentId: enrolmentId,
        studentProfileId,
        status,
        remarks,
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null);

  const res = await recordPeriodAttendance(slug, {
    teachingGroupId,
    attendanceDate,
    periodCode,
    entries,
  });

  if (!res.ok) return { status: "error", message: res.error };
  revalidateAttendanceRoutes(slug);
  return {
    status: "success",
    message: `Recorded period ${periodCode} attendance for ${res.data.savedCount} student(s).`,
  };
}

export async function recordStaffAttendanceAction(
  slug: string,
  attendanceDate: string,
  _prev: RegistryActionState,
  formData: FormData,
): Promise<RegistryActionState> {
  void _prev;
  const res = await recordStaffDailyAttendance(slug, {
    staffProfileId: fieldString(formData, "staffProfileId"),
    attendanceDate,
    status: fieldString(formData, "status"),
    checkInAt: normalizeAttendanceTimestamp(
      attendanceDate,
      fieldString(formData, "checkInTime"),
    ),
    checkOutAt: normalizeAttendanceTimestamp(
      attendanceDate,
      fieldString(formData, "checkOutTime"),
    ),
    remarks: fieldString(formData, "remarks"),
  });

  if (!res.ok) return { status: "error", message: res.error };
  revalidateAttendanceRoutes(slug);
  return {
    status: "success",
    message: `Saved staff daily attendance for ${res.data.attendanceDate}.`,
  };
}

export async function verifyOrSignOffStaffAttendanceAction(
  slug: string,
  attendanceId: string,
  targetStatus: "verified" | "signed_off",
  _prev: RegistryActionState,
): Promise<RegistryActionState> {
  void _prev;
  const res = await verifyOrSignOffStaffAttendance(slug, {
    attendanceId,
    targetStatus,
  });

  if (!res.ok) return { status: "error", message: res.error };
  revalidateAttendanceRoutes(slug);
  return {
    status: "success",
    message:
      res.data.status === "signed_off"
        ? "Staff attendance signed off."
        : "Staff attendance verified.",
  };
}

export async function correctStaffAttendanceAction(
  slug: string,
  _prev: RegistryActionState,
  formData: FormData,
): Promise<RegistryActionState> {
  void _prev;
  const res = await correctSignedOffStaffAttendance(slug, {
    attendanceId: fieldString(formData, "attendanceId"),
    newStatus: fieldString(formData, "newStatus"),
    correctionReason: fieldString(formData, "correctionReason"),
    remarks: fieldString(formData, "remarks"),
  });

  if (!res.ok) return { status: "error", message: res.error };
  revalidateAttendanceRoutes(slug);
  return {
    status: "success",
    message: `Recorded audited staff correction (#${res.data.correctionCount}).`,
  };
}

export async function updateAttendancePolicyAction(
  slug: string,
  _prev: RegistryActionState,
  formData: FormData,
): Promise<RegistryActionState> {
  void _prev;
  const res = await updateAttendancePolicy(slug, {
    minimumAttendancePercent: fieldString(formData, "minimumAttendancePercent"),
    warningThresholdPercent: fieldString(formData, "warningThresholdPercent"),
    periodAttendanceEnabled: fieldBoolean(formData, "periodAttendanceEnabled"),
    policyNotes: fieldString(formData, "policyNotes"),
  });

  if (!res.ok) return { status: "error", message: res.error };
  revalidateAttendanceRoutes(slug);
  return {
    status: "success",
    message: `Updated institutional attendance thresholds (${res.data.minimumAttendancePercent}% min / ${res.data.warningThresholdPercent}% warning).`,
  };
}
