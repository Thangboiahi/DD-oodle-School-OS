import type {
  CalendarEventStatus,
  SubstitutionStatus,
  TimetablePeriodKind,
  TimetableStatus,
} from "@/lib/timetable/schemas";

export const MAX_OFFLINE_TIMETABLE_SLOTS = 600;

export const DAY_OF_WEEK_LABELS: Readonly<Record<number, string>> = {
  1: "Monday",
  2: "Tuesday",
  3: "Wednesday",
  4: "Thursday",
  5: "Friday",
  6: "Saturday",
  7: "Sunday",
};

export interface TimetableSlotLike {
  id?: string;
  timetableId: string;
  dayOfWeek: number;
  periodId: string;
  teachingGroupId: string | null;
  sectionId: string | null;
  teacherPersonId: string | null;
  venueId: string | null;
}

export type TimetableSlotConflictKind =
  | "teacher"
  | "venue"
  | "teaching_group"
  | "section";

export interface TimetableSlotConflict {
  kind: TimetableSlotConflictKind;
  conflictingSlotId: string;
  message: string;
}

export function detectTimetableSlotConflicts(
  existingSlots: readonly TimetableSlotLike[],
  candidate: TimetableSlotLike & { ignoreSlotId?: string | null },
  periodKindById?: ReadonlyMap<string, TimetablePeriodKind>,
): TimetableSlotConflict[] {
  const conflicts: TimetableSlotConflict[] = [];
  const periodKind = periodKindById?.get(candidate.periodId) ?? "instructional";
  const checkSectionOverlap =
    periodKind === "instructional" || periodKind === "activity";

  for (const existing of existingSlots) {
    if (candidate.ignoreSlotId && existing.id === candidate.ignoreSlotId) {
      continue;
    }
    if (
      existing.timetableId !== candidate.timetableId ||
      existing.dayOfWeek !== candidate.dayOfWeek ||
      existing.periodId !== candidate.periodId
    ) {
      continue;
    }

    const slotId = existing.id ?? "unknown-slot";

    if (
      candidate.teacherPersonId &&
      existing.teacherPersonId === candidate.teacherPersonId
    ) {
      conflicts.push({
        kind: "teacher",
        conflictingSlotId: slotId,
        message: "Teacher is already booked in this day and period.",
      });
    }

    if (candidate.venueId && existing.venueId === candidate.venueId) {
      conflicts.push({
        kind: "venue",
        conflictingSlotId: slotId,
        message: "Venue is already booked in this day and period.",
      });
    }

    if (
      candidate.teachingGroupId &&
      existing.teachingGroupId === candidate.teachingGroupId
    ) {
      conflicts.push({
        kind: "teaching_group",
        conflictingSlotId: slotId,
        message: "Teaching group is already scheduled in this day and period.",
      });
    }

    if (
      checkSectionOverlap &&
      candidate.sectionId &&
      existing.sectionId === candidate.sectionId
    ) {
      conflicts.push({
        kind: "section",
        conflictingSlotId: slotId,
        message:
          "Section is already booked on an instructional/activity period in this day and period.",
      });
    }
  }

  return conflicts;
}

export interface TeacherWorkloadSummary {
  teacherPersonId: string;
  totalSlots: number;
  instructionalSlots: number;
  distinctDays: number;
}

export function computeTeacherWorkloadSummary(
  slots: readonly {
    teacherPersonId: string | null;
    periodId: string;
    dayOfWeek: number;
  }[],
  periodMap: ReadonlyMap<string, { periodKind: TimetablePeriodKind }>,
): TeacherWorkloadSummary[] {
  const byTeacher = new Map<
    string,
    { totalSlots: number; instructionalSlots: number; days: Set<number> }
  >();

  for (const slot of slots) {
    if (!slot.teacherPersonId) continue;

    let entry = byTeacher.get(slot.teacherPersonId);
    if (!entry) {
      entry = { totalSlots: 0, instructionalSlots: 0, days: new Set() };
      byTeacher.set(slot.teacherPersonId, entry);
    }

    entry.totalSlots += 1;
    const period = periodMap.get(slot.periodId);
    if (period?.periodKind === "instructional") {
      entry.instructionalSlots += 1;
    }
    entry.days.add(slot.dayOfWeek);
  }

  const summaries: TeacherWorkloadSummary[] = [];
  for (const [teacherPersonId, stats] of byTeacher.entries()) {
    summaries.push({
      teacherPersonId,
      totalSlots: stats.totalSlots,
      instructionalSlots: stats.instructionalSlots,
      distinctDays: stats.days.size,
    });
  }

  summaries.sort((a, b) => {
    if (b.totalSlots !== a.totalSlots) return b.totalSlots - a.totalSlots;
    return a.teacherPersonId.localeCompare(b.teacherPersonId);
  });

  return summaries;
}

export function filterAvailableSubstituteStaff<T extends { personId: string }>(
  staffCandidates: readonly T[],
  slot: {
    teacherPersonId: string | null;
    dayOfWeek: number;
    periodId: string;
  },
  existingSubstitutionsForDate: readonly {
    substituteTeacherPersonId: string;
    periodId: string;
    status: SubstitutionStatus;
  }[],
  existingSlotsForDayPeriod: readonly {
    teacherPersonId: string | null;
    dayOfWeek: number;
    periodId: string;
  }[],
): T[] {
  const busyPersonIds = new Set<string>();

  if (slot.teacherPersonId) {
    busyPersonIds.add(slot.teacherPersonId);
  }

  for (const existingSlot of existingSlotsForDayPeriod) {
    if (
      existingSlot.dayOfWeek === slot.dayOfWeek &&
      existingSlot.periodId === slot.periodId &&
      existingSlot.teacherPersonId
    ) {
      busyPersonIds.add(existingSlot.teacherPersonId);
    }
  }

  for (const sub of existingSubstitutionsForDate) {
    if (sub.status !== "cancelled" && sub.periodId === slot.periodId) {
      busyPersonIds.add(sub.substituteTeacherPersonId);
    }
  }

  return staffCandidates.filter((c) => !busyPersonIds.has(c.personId));
}

export function canTransitionTimetableStatus(
  current: TimetableStatus,
  target: TimetableStatus,
): boolean {
  if (current === "draft") {
    return target === "published" || target === "archived";
  }
  if (current === "published") {
    return target === "archived";
  }
  return false;
}

export function canTransitionCalendarEventStatus(
  current: CalendarEventStatus,
  target: CalendarEventStatus,
): boolean {
  if (current === "draft") {
    return target === "published" || target === "cancelled";
  }
  if (current === "published") {
    return target === "cancelled";
  }
  return false;
}

export interface OfflineTimetablePeriodDto {
  id: string;
  code: string;
  label: string;
  periodKind: TimetablePeriodKind;
  sequenceNo: number;
  startTime: string;
  endTime: string;
}

export interface OfflineTimetableSlotDto {
  dayOfWeek: number;
  periodId: string;
  groupLabel: string;
  teacherName: string | null;
  venueLabel: string | null;
}

export interface OfflineTimetableSnapshot {
  schemaVersion: 1;
  timetableId: string;
  code: string;
  name: string;
  versionNo: number;
  effectiveFrom: string;
  effectiveTo: string | null;
  periods: OfflineTimetablePeriodDto[];
  slots: OfflineTimetableSlotDto[];
}

export function buildOfflineTimetableSnapshot(
  timetable: {
    id: string;
    code: string;
    name: string;
    versionNo: number;
    effectiveFrom: string;
    effectiveTo: string | null;
    status: TimetableStatus;
    isOfflineCacheable: boolean;
  },
  periods: readonly OfflineTimetablePeriodDto[],
  venues: readonly { id: string; code: string; name: string }[],
  slots: readonly {
    timetableId: string;
    dayOfWeek: number;
    periodId: string;
    teachingGroupId: string | null;
    sectionId: string | null;
    teacherPersonId: string | null;
    venueId: string | null;
  }[],
  labelsMap: {
    teachingGroups: ReadonlyMap<string, string>;
    sections: ReadonlyMap<string, string>;
    teachers: ReadonlyMap<string, string>;
  },
): OfflineTimetableSnapshot | null {
  if (timetable.status !== "published" || !timetable.isOfflineCacheable) {
    return null;
  }

  const sortedPeriods = [...periods]
    .sort((a, b) => a.sequenceNo - b.sequenceNo)
    .map((p) => ({
      id: p.id,
      code: p.code,
      label: p.label,
      periodKind: p.periodKind,
      sequenceNo: p.sequenceNo,
      startTime: p.startTime.slice(0, 5),
      endTime: p.endTime.slice(0, 5),
    }));

  const periodSeqById = new Map<string, number>(
    sortedPeriods.map((p) => [p.id, p.sequenceNo]),
  );
  const venueLabelById = new Map<string, string>(
    venues.map((v) => [v.id, `${v.code} — ${v.name}`]),
  );

  const projectedSlots: OfflineTimetableSlotDto[] = slots
    .filter((slot) => slot.timetableId === timetable.id)
    .sort((a, b) => {
      if (a.dayOfWeek !== b.dayOfWeek) return a.dayOfWeek - b.dayOfWeek;
      return (
        (periodSeqById.get(a.periodId) ?? 999) -
        (periodSeqById.get(b.periodId) ?? 999)
      );
    })
    .slice(0, MAX_OFFLINE_TIMETABLE_SLOTS)
    .map((slot) => {
      const tgLabel = slot.teachingGroupId
        ? labelsMap.teachingGroups.get(slot.teachingGroupId)
        : undefined;
      const secLabel = slot.sectionId
        ? labelsMap.sections.get(slot.sectionId)
        : undefined;
      const groupLabel =
        [tgLabel, secLabel].filter(Boolean).join(" · ") || "Assigned Group";

      return {
        dayOfWeek: slot.dayOfWeek,
        periodId: slot.periodId,
        groupLabel,
        teacherName: slot.teacherPersonId
          ? (labelsMap.teachers.get(slot.teacherPersonId) ?? null)
          : null,
        venueLabel: slot.venueId
          ? (venueLabelById.get(slot.venueId) ?? null)
          : null,
      };
    });

  return {
    schemaVersion: 1,
    timetableId: timetable.id,
    code: timetable.code,
    name: timetable.name,
    versionNo: timetable.versionNo,
    effectiveFrom: timetable.effectiveFrom,
    effectiveTo: timetable.effectiveTo,
    periods: sortedPeriods,
    slots: projectedSlots,
  };
}
