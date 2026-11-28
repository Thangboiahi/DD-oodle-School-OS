"use server";

import { revalidatePath } from "next/cache";
import type { RegistryActionState } from "@/components/registry/RegistryActionForm";
import type { RecordCommentParentKind } from "@/lib/communication/schemas";
import {
  acknowledgeOfficialNotice,
  createOfficialNotice,
  createParentEnquiry,
  createRecordComment,
  transitionOfficialNoticeStatus,
  updateParentEnquiry,
} from "@/server/communication/service";

function fieldString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function fieldBool(formData: FormData, key: string): boolean {
  const value = formData.get(key);
  return value === "on" || value === "true" || value === "1";
}

function revalidateCommunicationPaths(slug: string, extraPath?: string) {
  const encodedSlug = encodeURIComponent(slug);
  revalidatePath(`/t/${encodedSlug}/communication`);
  revalidatePath(`/t/${encodedSlug}/communication/enquiries`);
  if (extraPath) {
    revalidatePath(extraPath);
  }
}

export async function createNoticeAction(
  slug: string,
  _prev: RegistryActionState,
  formData: FormData,
): Promise<RegistryActionState> {
  void _prev;
  const scopeType = fieldString(formData, "scopeType");
  const res = await createOfficialNotice(slug, {
    scopeType,
    departmentId:
      scopeType === "department" ? fieldString(formData, "departmentId") : null,
    sectionId:
      scopeType === "section" ? fieldString(formData, "sectionId") : null,
    teachingGroupId:
      scopeType === "teaching_group"
        ? fieldString(formData, "teachingGroupId")
        : null,
    category: fieldString(formData, "category"),
    title: fieldString(formData, "title"),
    body: fieldString(formData, "body"),
    requiresAcknowledgement: fieldBool(formData, "requiresAcknowledgement"),
    isOfflineCacheable: fieldBool(formData, "isOfflineCacheable"),
    initialStatus: fieldString(formData, "initialStatus") || "published",
  });

  if (!res.ok) return { status: "error", message: res.error };
  revalidateCommunicationPaths(
    slug,
    `/t/${encodeURIComponent(slug)}/communication/notices/${encodeURIComponent(res.data.id)}`,
  );
  return {
    status: "success",
    message: "Official notice recorded cleanly.",
  };
}

export async function transitionNoticeStatusAction(
  slug: string,
  noticeId: string,
  targetStatus: "published" | "archived",
  _prev: RegistryActionState,
): Promise<RegistryActionState> {
  void _prev;
  const res = await transitionOfficialNoticeStatus(slug, {
    noticeId,
    targetStatus,
  });

  if (!res.ok) return { status: "error", message: res.error };
  revalidateCommunicationPaths(
    slug,
    `/t/${encodeURIComponent(slug)}/communication/notices/${encodeURIComponent(noticeId)}`,
  );
  return {
    status: "success",
    message:
      targetStatus === "published"
        ? "Official notice published."
        : "Official notice archived.",
  };
}

export async function acknowledgeNoticeAction(
  slug: string,
  noticeId: string,
  _prev: RegistryActionState,
  formData: FormData,
): Promise<RegistryActionState> {
  void _prev;
  const res = await acknowledgeOfficialNotice(slug, {
    noticeId,
    studentProfileId: fieldString(formData, "studentProfileId") || null,
    note: fieldString(formData, "note") || undefined,
  });

  if (!res.ok) return { status: "error", message: res.error };
  revalidateCommunicationPaths(
    slug,
    `/t/${encodeURIComponent(slug)}/communication/notices/${encodeURIComponent(noticeId)}`,
  );
  return {
    status: "success",
    message: res.data.alreadyAcknowledged
      ? "Notice was already acknowledged."
      : "Notice acknowledgement recorded.",
  };
}

export async function createParentEnquiryAction(
  slug: string,
  _prev: RegistryActionState,
  formData: FormData,
): Promise<RegistryActionState> {
  void _prev;
  const res = await createParentEnquiry(slug, {
    studentProfileId: fieldString(formData, "studentProfileId"),
    category: fieldString(formData, "category"),
    subject: fieldString(formData, "subject"),
    body: fieldString(formData, "body"),
    teachingGroupId: fieldString(formData, "teachingGroupId") || null,
  });

  if (!res.ok) return { status: "error", message: res.error };
  revalidateCommunicationPaths(
    slug,
    `/t/${encodeURIComponent(slug)}/communication/enquiries/${encodeURIComponent(res.data.id)}`,
  );
  return {
    status: "success",
    message: "Formal enquiry submitted and assigned for staff review.",
  };
}

export async function updateParentEnquiryAction(
  slug: string,
  enquiryId: string,
  _prev: RegistryActionState,
  formData: FormData,
): Promise<RegistryActionState> {
  void _prev;
  const res = await updateParentEnquiry(slug, {
    enquiryId,
    targetStatus: fieldString(formData, "targetStatus"),
    assignedToPersonId: fieldString(formData, "assignedToPersonId") || null,
    resolutionSummary: fieldString(formData, "resolutionSummary") || undefined,
  });

  if (!res.ok) return { status: "error", message: res.error };
  revalidateCommunicationPaths(
    slug,
    `/t/${encodeURIComponent(slug)}/communication/enquiries/${encodeURIComponent(enquiryId)}`,
  );
  return {
    status: "success",
    message: `Enquiry case updated to ${res.data.status}.`,
  };
}

export async function createRecordCommentAction(
  slug: string,
  parentKind: RecordCommentParentKind,
  parentId: string,
  _prev: RegistryActionState,
  formData: FormData,
): Promise<RegistryActionState> {
  void _prev;
  const res = await createRecordComment(slug, {
    parentKind,
    parentId,
    body: fieldString(formData, "body"),
    isInternalStaffNote: fieldBool(formData, "isInternalStaffNote"),
  });

  if (!res.ok) return { status: "error", message: res.error };

  const encodedSlug = encodeURIComponent(slug);
  const encodedId = encodeURIComponent(parentId);
  const detailPath =
    parentKind === "notice"
      ? `/t/${encodedSlug}/communication/notices/${encodedId}`
      : parentKind === "parent_enquiry"
        ? `/t/${encodedSlug}/communication/enquiries/${encodedId}`
        : `/t/${encodedSlug}/academics`;

  revalidateCommunicationPaths(slug, detailPath);
  return {
    status: "success",
    message: "Contextual note posted cleanly.",
  };
}
