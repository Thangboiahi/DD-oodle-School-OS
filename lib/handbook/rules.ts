import type {
  HandbookCategory,
  HandbookEntryStatus,
  HandbookVisibilityScope,
} from "@/lib/handbook/schemas";

export interface HandbookCategoryMeta {
  key: HandbookCategory;
  label: string;
  description: string;
  isSensitive: boolean;
  displayOrder: number;
}

export const HANDBOOK_CATEGORY_META: Record<
  HandbookCategory,
  HandbookCategoryMeta
> = {
  academic_observation: {
    key: "academic_observation",
    label: "Academic Observation",
    description:
      "Subject-teacher or class-teacher academic feedback, classwork notes, and progress observations.",
    isSensitive: false,
    displayOrder: 1,
  },
  notice_ack: {
    key: "notice_ack",
    label: "Notice & Acknowledgement",
    description:
      "Formal student-handbook circulars, compliance acknowledgements, and guardian sign-offs.",
    isSensitive: false,
    displayOrder: 2,
  },
  parent_comm_ref: {
    key: "parent_comm_ref",
    label: "Parent Comm Ref",
    description:
      "Structured summaries referencing guardian consultations, PTM outcomes, or call logs.",
    isSensitive: false,
    displayOrder: 3,
  },
  student_support: {
    key: "student_support",
    label: "Student Support",
    description:
      "Wellbeing, counselling follow-ups, and learning support notes restricted to authorized staff.",
    isSensitive: true,
    displayOrder: 4,
  },
  disciplinary: {
    key: "disciplinary",
    label: "Disciplinary",
    description:
      "Sensitive conduct records partitioned strictly to Class Teacher/HOD or Leadership visibility scopes.",
    isSensitive: true,
    displayOrder: 5,
  },
};

export interface HandbookVisibilityMeta {
  key: HandbookVisibilityScope;
  label: string;
  shortLabel: string;
  isRestricted: boolean;
  displayOrder: number;
}

export const HANDBOOK_VISIBILITY_META: Record<
  HandbookVisibilityScope,
  HandbookVisibilityMeta
> = {
  student_and_guardian: {
    key: "student_and_guardian",
    label: "Student & Linked Guardian (plus Class Leadership)",
    shortLabel: "Student & Guardian",
    isRestricted: false,
    displayOrder: 1,
  },
  staff_academic: {
    key: "staff_academic",
    label: "Teaching & Academic Staff Only",
    shortLabel: "Staff Academic",
    isRestricted: false,
    displayOrder: 2,
  },
  class_teacher_and_leadership: {
    key: "class_teacher_and_leadership",
    label: "Class Teacher, HOD & Leadership Only",
    shortLabel: "Class Teacher & Leadership",
    isRestricted: true,
    displayOrder: 3,
  },
  leadership_only: {
    key: "leadership_only",
    label: "Leadership Sensitive Access Only",
    shortLabel: "Leadership Only",
    isRestricted: true,
    displayOrder: 4,
  },
};

export interface HandbookAuthoringPolicy {
  canCreateEntry: boolean;
  allowedCategories: readonly HandbookCategory[];
  allowedVisibilityScopes: readonly HandbookVisibilityScope[];
  assignedTeachingGroupIds: readonly string[];
  requiresTeachingGroupSelection: boolean;
}

export interface ResolveHandbookPolicyInput {
  isLeadership: boolean;
  isClassTeacherOrHod: boolean;
  assignedTeachingGroupIds: readonly string[];
}

/**
 * Computes deterministic handbook authoring capabilities strictly aligned with
 * ADR-0006 and PostgreSQL `handbook_entries_insert` RLS.
 */
export function resolveHandbookAuthoringPolicy(
  input: ResolveHandbookPolicyInput,
): HandbookAuthoringPolicy {
  const uniqueGroups = [...new Set(input.assignedTeachingGroupIds)];

  if (input.isLeadership) {
    return {
      canCreateEntry: true,
      allowedCategories: [
        "academic_observation",
        "notice_ack",
        "parent_comm_ref",
        "student_support",
        "disciplinary",
      ],
      allowedVisibilityScopes: [
        "student_and_guardian",
        "staff_academic",
        "class_teacher_and_leadership",
        "leadership_only",
      ],
      assignedTeachingGroupIds: uniqueGroups,
      requiresTeachingGroupSelection: false,
    };
  }

  if (input.isClassTeacherOrHod) {
    return {
      canCreateEntry: true,
      allowedCategories: [
        "academic_observation",
        "notice_ack",
        "parent_comm_ref",
        "student_support",
        "disciplinary",
      ],
      allowedVisibilityScopes: [
        "student_and_guardian",
        "staff_academic",
        "class_teacher_and_leadership",
      ],
      assignedTeachingGroupIds: uniqueGroups,
      requiresTeachingGroupSelection: false,
    };
  }

  if (uniqueGroups.length > 0) {
    return {
      canCreateEntry: true,
      allowedCategories: ["academic_observation"],
      allowedVisibilityScopes: ["student_and_guardian", "staff_academic"],
      assignedTeachingGroupIds: uniqueGroups,
      requiresTeachingGroupSelection: true,
    };
  }

  return {
    canCreateEntry: false,
    allowedCategories: [],
    allowedVisibilityScopes: [],
    assignedTeachingGroupIds: [],
    requiresTeachingGroupSelection: false,
  };
}

/**
 * Defense-in-depth validation of handbook entry category, visibility scope,
 * and subject-teacher teaching-group ownership prior to PostgreSQL write.
 */
export function validateEntryAuthoringAgainstPolicy(
  input: {
    category: HandbookCategory;
    visibilityScope: HandbookVisibilityScope;
    teachingGroupId?: string | null;
  },
  policy: HandbookAuthoringPolicy,
): { ok: true } | { ok: false; error: string } {
  if (!policy.canCreateEntry) {
    return {
      ok: false,
      error: "You do not have authority to author entries in this handbook.",
    };
  }

  if (!policy.allowedCategories.includes(input.category)) {
    return {
      ok: false,
      error: `Category "${HANDBOOK_CATEGORY_META[input.category].label}" is not permitted for your role on this student.`,
    };
  }

  if (!policy.allowedVisibilityScopes.includes(input.visibilityScope)) {
    return {
      ok: false,
      error: `Visibility scope "${HANDBOOK_VISIBILITY_META[input.visibilityScope].shortLabel}" is not permitted for your role.`,
    };
  }

  if (policy.requiresTeachingGroupSelection) {
    if (
      !input.teachingGroupId ||
      !policy.assignedTeachingGroupIds.includes(input.teachingGroupId)
    ) {
      return {
        ok: false,
        error:
          "Subject teachers must link academic observations to an active teaching group shared with this student.",
      };
    }
  } else if (
    input.teachingGroupId &&
    !policy.assignedTeachingGroupIds.includes(input.teachingGroupId)
  ) {
    return {
      ok: false,
      error: "Selected teaching group is not active for this student.",
    };
  }

  return { ok: true };
}

export interface GuardianAcknowledgeGuardInput {
  isLinkedGuardian: boolean;
  status: HandbookEntryStatus;
  visibilityScope: HandbookVisibilityScope;
  alreadyAcknowledged: boolean;
}

/**
 * Only an active linked guardian may acknowledge an active `student_and_guardian`
 * entry that has not yet been acknowledged.
 */
export function canGuardianAcknowledgeEntry(
  input: GuardianAcknowledgeGuardInput,
): boolean {
  return (
    input.isLinkedGuardian &&
    input.status === "active" &&
    input.visibilityScope === "student_and_guardian" &&
    !input.alreadyAcknowledged
  );
}

export interface HandbookExtensionSeamDto {
  id: string;
  phase: "Phase 6";
  title: string;
  status: "planned";
  description: string;
}

/**
 * Typed ADR-0006 extension seams reserving future Phase 6 sections
 * without emitting placeholder rows now that Phase 4 Assignments are live.
 */
export function buildHandbookExtensionSeams(): readonly HandbookExtensionSeamDto[] {
  return [
    {
      id: "fee-receipts-ledger",
      phase: "Phase 6",
      title: "Fee Receipts & Ledger",
      status: "planned",
      description:
        "Fee Receipts & Ledger — available in Phase 6 (tuition schedules, invoices, and verified payment receipts).",
    },
  ];
}
