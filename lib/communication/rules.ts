import type {
  EnquiryStatus,
  NoticeCategory,
  NoticeScopeType,
  NoticeStatus,
} from "@/lib/communication/schemas";

export interface NoticeAuthoringPolicy {
  canCreateNotice: boolean;
  isLeadership: boolean;
  allowedScopes: readonly NoticeScopeType[];
  allowedDepartmentIds: readonly string[];
  allowedSectionIds: readonly string[];
  allowedTeachingGroupIds: readonly string[];
}

export interface ResolveNoticePolicyInput {
  isLeadership: boolean;
  hodDepartmentIds: readonly string[];
  classTeacherSectionIds: readonly string[];
  subjectTeacherGroupIds: readonly string[];
}

/**
 * Computes institutional & academic scope authoring rights matching ADR-0007
 * and PostgreSQL `official_notices_insert` RLS.
 */
export function resolveNoticeAuthoringPolicy(
  input: ResolveNoticePolicyInput,
): NoticeAuthoringPolicy {
  const allowedDepartmentIds = [...new Set(input.hodDepartmentIds)];
  const allowedSectionIds = [...new Set(input.classTeacherSectionIds)];
  const allowedTeachingGroupIds = [...new Set(input.subjectTeacherGroupIds)];

  if (input.isLeadership) {
    return {
      canCreateNotice: true,
      isLeadership: true,
      allowedScopes: [
        "institution",
        "department",
        "section",
        "teaching_group",
      ],
      allowedDepartmentIds,
      allowedSectionIds,
      allowedTeachingGroupIds,
    };
  }

  const allowedScopes: NoticeScopeType[] = [];
  if (allowedDepartmentIds.length > 0) allowedScopes.push("department");
  if (allowedSectionIds.length > 0) allowedScopes.push("section");
  if (allowedTeachingGroupIds.length > 0) allowedScopes.push("teaching_group");

  return {
    canCreateNotice: allowedScopes.length > 0,
    isLeadership: false,
    allowedScopes,
    allowedDepartmentIds,
    allowedSectionIds,
    allowedTeachingGroupIds,
  };
}

/**
 * Defense-in-depth verification of notice scope & target ID against the caller's
 * authoring policy before persisting to PostgreSQL.
 */
export function validateNoticeAuthoringAgainstPolicy(
  input: {
    scopeType: NoticeScopeType;
    departmentId?: string | null;
    sectionId?: string | null;
    teachingGroupId?: string | null;
  },
  policy: NoticeAuthoringPolicy,
): { ok: true } | { ok: false; error: string } {
  if (!policy.canCreateNotice) {
    return {
      ok: false,
      error: "You do not have authority to issue official notices.",
    };
  }

  if (!policy.allowedScopes.includes(input.scopeType)) {
    return {
      ok: false,
      error: `Notice scope "${input.scopeType}" is not permitted for your institutional role.`,
    };
  }

  if (policy.isLeadership) {
    return { ok: true };
  }

  if (
    input.scopeType === "department" &&
    (!input.departmentId ||
      !policy.allowedDepartmentIds.includes(input.departmentId))
  ) {
    return {
      ok: false,
      error: "You may only issue department notices for assigned HOD departments.",
    };
  }

  if (
    input.scopeType === "section" &&
    (!input.sectionId || !policy.allowedSectionIds.includes(input.sectionId))
  ) {
    return {
      ok: false,
      error: "You may only issue section notices for assigned sections.",
    };
  }

  if (
    input.scopeType === "teaching_group" &&
    (!input.teachingGroupId ||
      !policy.allowedTeachingGroupIds.includes(input.teachingGroupId))
  ) {
    return {
      ok: false,
      error:
        "You may only issue teaching-group notices for assigned teaching groups.",
    };
  }

  return { ok: true };
}

export function canTransitionNoticeStatus(
  current: NoticeStatus,
  target: NoticeStatus,
): boolean {
  if (current === "draft") {
    return target === "published" || target === "archived";
  }
  if (current === "published") {
    return target === "archived";
  }
  return false;
}

export function canTransitionEnquiryStatus(
  current: EnquiryStatus,
  target: EnquiryStatus,
): boolean {
  if (current === "open") {
    return target === "in_review" || target === "resolved" || target === "closed";
  }
  if (current === "in_review") {
    return target === "resolved" || target === "closed";
  }
  if (current === "resolved") {
    return target === "closed";
  }
  return false;
}

export function canPostInternalStaffNote(input: {
  isStaffOrLeadership: boolean;
}): boolean {
  return input.isStaffOrLeadership;
}

/**
 * Generates an explicit user-triggered `https://wa.me/<digits>?text=...` click-to-chat
 * link ONLY for non-authoritative informal coordination per Blueprint §5.4.
 */
export function buildWhatsAppClickToChatUrl(input: {
  phone?: string | null;
  prefillText?: string | null;
}): string | null {
  const digits = (input.phone ?? "").replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 15) {
    return null;
  }

  const trimmedText = (input.prefillText ?? "").trim();
  if (!trimmedText) {
    return `https://wa.me/${digits}`;
  }

  return `https://wa.me/${digits}?text=${encodeURIComponent(trimmedText)}`;
}

export interface CacheableNoticeSource {
  id: string;
  title: string;
  body: string;
  category: NoticeCategory;
  scopeType: NoticeScopeType;
  status: NoticeStatus;
  isOfflineCacheable: boolean;
  publishedAt: string | null;
}

export interface OfflineCachedNoticeDto {
  id: string;
  title: string;
  body: string;
  category: NoticeCategory;
  scopeType: NoticeScopeType;
  publishedAt: string | null;
}

/**
 * Strictly extracts ONLY published, explicitly flagged `is_offline_cacheable`
 * notice summaries safe for controlled client storage per Blueprint Part A §12.5.
 */
export function filterCacheablePublishedNotices(
  notices: readonly CacheableNoticeSource[],
): OfflineCachedNoticeDto[] {
  return notices
    .filter((n) => n.status === "published" && n.isOfflineCacheable)
    .map((n) => ({
      id: n.id,
      title: n.title,
      body: n.body,
      category: n.category,
      scopeType: n.scopeType,
      publishedAt: n.publishedAt,
    }));
}
