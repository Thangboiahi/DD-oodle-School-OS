"use server";

import { revalidatePath } from "next/cache";
import type { RegistryActionState } from "@/components/registry/RegistryActionForm";
import {
  acknowledgeParentAttendanceNotice,
  cancelLeaveApplication,
  reviewLeaveApplication,
  submitParentAttendanceNotice,
  submitStaffLeaveApplication,
  submitStudentLeaveApplication,
} from "@/server/leave/service";

function fieldString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function revalidateLeaveAndAttendance(slug: string) {
  const encoded = encodeURIComponent(slug);
  revalidatePath(`/t/${encoded}/leave`);
  revalidatePath(`/t/${encoded}/leave/notices`);
  revalidatePath(`/t/${encoded}/attendance`);
  revalidatePath(`/t/${encoded}/attendance/summary`);
}

export async function submitStudentLeaveAction(
  slug: string,
  _prev: RegistryActionState,
  formData: FormData,
): Promise<RegistryActionState> {
  void _prev;
  const res = await submitStudentLeaveApplication(slug, {
    studentProfileId: fieldString(formData, "studentProfileId"),
    startsOn: fieldString(formData, "startsOn"),
    endsOn: fieldString(formData, "endsOn"),
    leaveType: fieldString(formData, "leaveType"),
    reason: fieldString(formData, "reason"),
  });

  if (!res.ok) return { status: "error", message: res.error };
  revalidateLeaveAndAttendance(slug);
  return {
    status: "success",
    message: "Student leave application submitted.",
  };
}

export async function submitStaffLeaveAction(
  slug: string,
  _prev: RegistryActionState,
  formData: FormData,
): Promise<RegistryActionState> {
  void _prev;
  const res = await submitStaffLeaveApplication(slug, {
    staffProfileId: fieldString(formData, "staffProfileId"),
    startsOn: fieldString(formData, "startsOn"),
    endsOn: fieldString(formData, "endsOn"),
    leaveType: fieldString(formData, "leaveType"),
    reason: fieldString(formData, "reason"),
  });

  if (!res.ok) return { status: "error", message: res.error };
  revalidateLeaveAndAttendance(slug);
  return {
    status: "success",
    message: "Staff leave application submitted.",
  };
}

export async function reviewLeaveAction(
  slug: string,
  leaveId: string,
  decision: "approved" | "rejected",
  _prev: RegistryActionState,
  formData: FormData,
): Promise<RegistryActionState> {
  void _prev;
  const res = await reviewLeaveApplication(slug, {
    leaveId,
    decision,
    decisionNote: fieldString(formData, "decisionNote"),
  });

  if (!res.ok) return { status: "error", message: res.error };
  revalidateLeaveAndAttendance(slug);
  return {
    status: "success",
    message: `Leave application marked ${res.data.status}.`,
  };
}

export async function cancelLeaveAction(
  slug: string,
  leaveId: string,
  _prev: RegistryActionState,
): Promise<RegistryActionState> {
  void _prev;
  const res = await cancelLeaveApplication(slug, { leaveId });

  if (!res.ok) return { status: "error", message: res.error };
  revalidateLeaveAndAttendance(slug);
  return {
    status: "success",
    message: "Leave application cancelled.",
  };
}

export async function submitParentNoticeAction(
  slug: string,
  _prev: RegistryActionState,
  formData: FormData,
): Promise<RegistryActionState> {
  void _prev;
  const res = await submitParentAttendanceNotice(slug, {
    studentProfileId: fieldString(formData, "studentProfileId"),
    attendanceDate: fieldString(formData, "attendanceDate"),
    noticeKind: fieldString(formData, "noticeKind"),
    message: fieldString(formData, "message"),
  });

  if (!res.ok) return { status: "error", message: res.error };
  revalidateLeaveAndAttendance(slug);
  return {
    status: "success",
    message: "Parent attendance notice submitted.",
  };
}

export async function acknowledgeParentNoticeAction(
  slug: string,
  noticeId: string,
  _prev: RegistryActionState,
): Promise<RegistryActionState> {
  void _prev;
  const res = await acknowledgeParentAttendanceNotice(slug, { noticeId });

  if (!res.ok) return { status: "error", message: res.error };
  revalidateLeaveAndAttendance(slug);
  return {
    status: "success",
    message: "Parent attendance notice acknowledged.",
  };
}
