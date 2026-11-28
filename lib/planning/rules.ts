import type {
  LearningResourceStatus,
  SyllabusItemKind,
  SyllabusProgressStatus,
} from "@/lib/planning/schemas";

/**
 * Validates external URLs strictly allowing `http:` or `https:` protocols only.
 */
export function isSafeHttpUrl(rawUrl: string): boolean {
  const trimmed = rawUrl.trim();
  if (!trimmed) return false;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

/**
 * Enforces Unit -> Chapter -> Topic hierarchy rules.
 */
export function validateSyllabusParentKind(
  parentKind: SyllabusItemKind | null,
  childKind: SyllabusItemKind,
): { ok: true } | { ok: false; error: string } {
  if (parentKind === null) {
    return { ok: true };
  }

  if (childKind === "unit") {
    return {
      ok: false,
      error: "Top-level syllabus units cannot be nested under another item.",
    };
  }

  if (childKind === "chapter" && parentKind !== "unit") {
    return {
      ok: false,
      error: "Chapters can only be nested directly under a Unit.",
    };
  }

  if (childKind === "topic" && parentKind === "topic") {
    return {
      ok: false,
      error: "Topics must belong to a Chapter or Unit (not another Topic).",
    };
  }

  return { ok: true };
}

export interface SyllabusTreeInputItem {
  id: string;
  parentItemId: string | null;
  itemKind: SyllabusItemKind;
  code: string;
  title: string;
  sequenceNo: number;
}

export type SyllabusTreeNode<T extends SyllabusTreeInputItem> = T & {
  children: SyllabusTreeNode<T>[];
};

function compareSyllabusItems(
  a: SyllabusTreeInputItem,
  b: SyllabusTreeInputItem,
): number {
  if (a.sequenceNo !== b.sequenceNo) {
    return a.sequenceNo - b.sequenceNo;
  }
  const codeCmp = a.code.localeCompare(b.code);
  if (codeCmp !== 0) return codeCmp;
  return a.title.localeCompare(b.title);
}

/**
 * Builds a deterministic hierarchical syllabus tree ordered by (sequenceNo, code, title)
 * while cleanly surfacing any orphaned items at root level so zero records disappear.
 */
export function buildSyllabusTree<T extends SyllabusTreeInputItem>(
  items: readonly T[],
): SyllabusTreeNode<T>[] {
  const nodeById = new Map<string, SyllabusTreeNode<T>>();
  for (const item of items) {
    nodeById.set(item.id, { ...item, children: [] });
  }

  const roots: SyllabusTreeNode<T>[] = [];
  for (const item of items) {
    const node = nodeById.get(item.id);
    if (!node) continue;

    if (
      item.parentItemId &&
      item.parentItemId !== item.id &&
      nodeById.has(item.parentItemId)
    ) {
      nodeById.get(item.parentItemId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  const sortRecursive = (nodes: SyllabusTreeNode<T>[]) => {
    nodes.sort(compareSyllabusItems);
    for (const child of nodes) {
      if (child.children.length > 0) {
        sortRecursive(child.children);
      }
    }
  };

  sortRecursive(roots);
  return roots;
}

export interface SyllabusProgressRollup {
  total: number;
  notStarted: number;
  inProgress: number;
  completed: number;
  revised: number;
  delayed: number;
  completionPercent: number;
}

export function computeSyllabusProgressRollup(
  items: readonly { progressStatus: SyllabusProgressStatus }[],
): SyllabusProgressRollup {
  let notStarted = 0;
  let inProgress = 0;
  let completed = 0;
  let revised = 0;
  let delayed = 0;

  for (const item of items) {
    switch (item.progressStatus) {
      case "not_started":
        notStarted += 1;
        break;
      case "in_progress":
        inProgress += 1;
        break;
      case "completed":
        completed += 1;
        break;
      case "revised":
        revised += 1;
        break;
      case "delayed":
        delayed += 1;
        break;
    }
  }

  const total = items.length;
  const completionPercent =
    total === 0 ? 0 : Math.round(((completed + revised) / total) * 100);

  return {
    total,
    notStarted,
    inProgress,
    completed,
    revised,
    delayed,
    completionPercent,
  };
}

export interface ResolvePlanningRoleAccessInput {
  isLeadership: boolean;
  isHod: boolean;
  isClassTeacher: boolean;
  subjectTeacherOfferingIds: readonly string[];
  subjectTeacherGroupIds: readonly string[];
  isStudentOrGuardian: boolean;
  isMonitor: boolean;
}

export interface PlanningRoleAccess {
  canManageTerms: boolean;
  canManageSyllabus: boolean;
  canAccessLessonPlans: boolean;
  canAccessOversight: boolean;
  canManageResources: boolean;
  manageableOfferingIds: readonly string[];
  writableTeachingGroupIds: readonly string[];
  isReadOnlyLearner: boolean;
}

/**
 * Resolves planning permissions matching ADR-0008 and Phase 4 PostgreSQL RLS.
 */
export function resolvePlanningRoleAccess(
  input: ResolvePlanningRoleAccessInput,
): PlanningRoleAccess {
  const manageableOfferingIds = [...new Set(input.subjectTeacherOfferingIds)];
  const writableTeachingGroupIds = [...new Set(input.subjectTeacherGroupIds)];

  const isStaffEducator =
    input.isLeadership ||
    input.isHod ||
    input.isClassTeacher ||
    writableTeachingGroupIds.length > 0;

  if (!isStaffEducator) {
    return {
      canManageTerms: false,
      canManageSyllabus: false,
      canAccessLessonPlans: false,
      canAccessOversight: false,
      canManageResources: false,
      manageableOfferingIds: [],
      writableTeachingGroupIds: [],
      isReadOnlyLearner: input.isStudentOrGuardian || input.isMonitor,
    };
  }

  return {
    canManageTerms: input.isLeadership,
    canManageSyllabus:
      input.isLeadership || input.isHod || manageableOfferingIds.length > 0,
    canAccessLessonPlans: true,
    canAccessOversight:
      input.isLeadership || input.isHod || input.isClassTeacher,
    canManageResources:
      input.isLeadership || input.isHod || writableTeachingGroupIds.length > 0,
    manageableOfferingIds,
    writableTeachingGroupIds,
    isReadOnlyLearner: false,
  };
}

export function canTransitionResourceStatus(
  current: LearningResourceStatus,
  target: LearningResourceStatus,
): boolean {
  if (current === "draft") {
    return target === "published" || target === "archived";
  }
  if (current === "published") {
    return target === "archived";
  }
  return false;
}
