import { describe, expect, it } from "vitest";
import {
  buildOfflineTimetableSnapshot,
  canTransitionCalendarEventStatus,
  canTransitionTimetableStatus,
  computeTeacherWorkloadSummary,
  detectTimetableSlotConflicts,
  filterAvailableSubstituteStaff,
  MAX_OFFLINE_TIMETABLE_SLOTS,
  type TimetableSlotLike,
} from "@/lib/timetable/rules";
import {
  createCalendarEventSchema,
  createTimetablePeriodSchema,
  createTimetableSchema,
  createTimetableSlotSchema,
  type TimetablePeriodKind,
} from "@/lib/timetable/schemas";

const TT_ID = "eeeeeeee-eeee-4eee-8eee-eeeeeeee2101";
const P1_ID = "eeeeeeee-eeee-4eee-8eee-eeeeeeee1101";
const P2_ID = "eeeeeeee-eeee-4eee-8eee-eeeeeeee1102";
const BREAK_ID = "eeeeeeee-eeee-4eee-8eee-eeeeeeee1103";
const TG1_ID = "99999999-9999-4999-8999-999999999101";
const TG2_ID = "99999999-9999-4999-8999-999999999102";
const SEC1_ID = "99999999-9999-4999-8999-999999994101";
const SEC2_ID = "99999999-9999-4999-8999-999999994102";
const TCH1_ID = "33333333-3333-4333-8333-333333333302";
const TCH2_ID = "33333333-3333-4333-8333-333333333305";
const TCH3_ID = "33333333-3333-4333-8333-333333333306";
const VEN1_ID = "eeeeeeee-eeee-4eee-8eee-eeeeeeee0101";
const VEN2_ID = "eeeeeeee-eeee-4eee-8eee-eeeeeeee0102";
const DEPT_ID = "44444444-4444-4444-8444-444444440101";

describe("detectTimetableSlotConflicts", () => {
  const periodMap = new Map<string, TimetablePeriodKind>([
    [P1_ID, "instructional"],
    [P2_ID, "instructional"],
    [BREAK_ID, "break"],
  ]);

  const existing: TimetableSlotLike[] = [
    {
      id: "slot-1",
      timetableId: TT_ID,
      dayOfWeek: 1,
      periodId: P1_ID,
      teachingGroupId: TG1_ID,
      sectionId: SEC1_ID,
      teacherPersonId: TCH1_ID,
      venueId: VEN1_ID,
    },
    {
      id: "slot-break",
      timetableId: TT_ID,
      dayOfWeek: 1,
      periodId: BREAK_ID,
      teachingGroupId: null,
      sectionId: SEC1_ID,
      teacherPersonId: null,
      venueId: null,
    },
  ];

  it("flags teacher, venue, teaching_group, and instructional section overlaps cleanly", () => {
    const conflicts = detectTimetableSlotConflicts(
      existing,
      {
        timetableId: TT_ID,
        dayOfWeek: 1,
        periodId: P1_ID,
        teachingGroupId: TG1_ID,
        sectionId: SEC1_ID,
        teacherPersonId: TCH1_ID,
        venueId: VEN1_ID,
      },
      periodMap,
    );

    expect(conflicts.map((c) => c.kind).sort()).toEqual([
      "section",
      "teacher",
      "teaching_group",
      "venue",
    ]);
  });

  it("ignores section overlaps on break periods and allows non-overlapping slots", () => {
    const breakConflicts = detectTimetableSlotConflicts(
      existing,
      {
        timetableId: TT_ID,
        dayOfWeek: 1,
        periodId: BREAK_ID,
        teachingGroupId: TG2_ID,
        sectionId: SEC1_ID,
        teacherPersonId: TCH2_ID,
        venueId: VEN2_ID,
      },
      periodMap,
    );
    expect(breakConflicts).toEqual([]);

    const differentPeriod = detectTimetableSlotConflicts(
      existing,
      {
        timetableId: TT_ID,
        dayOfWeek: 1,
        periodId: P2_ID,
        teachingGroupId: TG1_ID,
        sectionId: SEC1_ID,
        teacherPersonId: TCH1_ID,
        venueId: VEN1_ID,
      },
      periodMap,
    );
    expect(differentPeriod).toEqual([]);
  });

  it("skips self when ignoreSlotId matches", () => {
    const selfConflicts = detectTimetableSlotConflicts(
      existing,
      {
        ignoreSlotId: "slot-1",
        timetableId: TT_ID,
        dayOfWeek: 1,
        periodId: P1_ID,
        teachingGroupId: TG1_ID,
        sectionId: SEC1_ID,
        teacherPersonId: TCH1_ID,
        venueId: VEN1_ID,
      },
      periodMap,
    );
    expect(selfConflicts).toEqual([]);
  });
});

describe("computeTeacherWorkloadSummary & filterAvailableSubstituteStaff", () => {
  it("computes total slots, instructional counts, and distinct days per teacher", () => {
    const periodMap = new Map<string, { periodKind: TimetablePeriodKind }>([
      [P1_ID, { periodKind: "instructional" }],
      [BREAK_ID, { periodKind: "break" }],
    ]);

    const summary = computeTeacherWorkloadSummary(
      [
        { teacherPersonId: TCH1_ID, periodId: P1_ID, dayOfWeek: 1 },
        { teacherPersonId: TCH1_ID, periodId: P1_ID, dayOfWeek: 2 },
        { teacherPersonId: TCH1_ID, periodId: BREAK_ID, dayOfWeek: 2 },
        { teacherPersonId: TCH2_ID, periodId: P1_ID, dayOfWeek: 1 },
        { teacherPersonId: null, periodId: P1_ID, dayOfWeek: 3 },
      ],
      periodMap,
    );

    expect(summary).toEqual([
      {
        teacherPersonId: TCH1_ID,
        totalSlots: 3,
        instructionalSlots: 2,
        distinctDays: 2,
      },
      {
        teacherPersonId: TCH2_ID,
        totalSlots: 1,
        instructionalSlots: 1,
        distinctDays: 1,
      },
    ]);
  });

  it("excludes original teacher, busy period teachers, and active date substitutes, but allows cancelled subs", () => {
    const candidates = [
      { personId: TCH1_ID, name: "Original" },
      { personId: TCH2_ID, name: "Busy Teacher" },
      { personId: TCH3_ID, name: "Covering Other" },
      { personId: "33333333-3333-4333-8333-333333333309", name: "Free Staff" },
    ];

    const available = filterAvailableSubstituteStaff(
      candidates,
      { teacherPersonId: TCH1_ID, dayOfWeek: 1, periodId: P1_ID },
      [
        {
          substituteTeacherPersonId: TCH3_ID,
          periodId: P1_ID,
          status: "assigned",
        },
        {
          substituteTeacherPersonId: "33333333-3333-4333-8333-333333333309",
          periodId: P1_ID,
          status: "cancelled",
        },
      ],
      [{ teacherPersonId: TCH2_ID, dayOfWeek: 1, periodId: P1_ID }],
    );

    expect(available.map((a) => a.personId)).toEqual([
      "33333333-3333-4333-8333-333333333309",
    ]);
  });
});

describe("status transitions & buildOfflineTimetableSnapshot", () => {
  it("enforces timetable and calendar status transition guards", () => {
    expect(canTransitionTimetableStatus("draft", "published")).toBe(true);
    expect(canTransitionTimetableStatus("draft", "archived")).toBe(true);
    expect(canTransitionTimetableStatus("published", "archived")).toBe(true);
    expect(canTransitionTimetableStatus("published", "draft")).toBe(false);
    expect(canTransitionTimetableStatus("archived", "published")).toBe(false);
    expect(canTransitionTimetableStatus("archived", "draft")).toBe(false);

    expect(canTransitionCalendarEventStatus("draft", "published")).toBe(true);
    expect(canTransitionCalendarEventStatus("published", "cancelled")).toBe(
      true,
    );
    expect(canTransitionCalendarEventStatus("cancelled", "published")).toBe(
      false,
    );
  });

  it("blocks offline caching for draft, archived, or non-cacheable timetables and projects sorted published snapshots", () => {
    const periods = [
      {
        id: P2_ID,
        code: "P2",
        label: "Period 2",
        periodKind: "instructional" as const,
        sequenceNo: 2,
        startTime: "09:15:00",
        endTime: "10:00:00",
      },
      {
        id: P1_ID,
        code: "P1",
        label: "Period 1",
        periodKind: "instructional" as const,
        sequenceNo: 1,
        startTime: "08:30:00",
        endTime: "09:15:00",
      },
    ];
    const venues = [{ id: VEN1_ID, code: "RM-XI-A", name: "XI-A Homeroom" }];
    const slots = [
      {
        timetableId: TT_ID,
        dayOfWeek: 1,
        periodId: P2_ID,
        teachingGroupId: TG2_ID,
        sectionId: null,
        teacherPersonId: TCH2_ID,
        venueId: VEN1_ID,
      },
      {
        timetableId: TT_ID,
        dayOfWeek: 1,
        periodId: P1_ID,
        teachingGroupId: TG1_ID,
        sectionId: null,
        teacherPersonId: TCH1_ID,
        venueId: VEN1_ID,
      },
      {
        timetableId: "other-timetable",
        dayOfWeek: 1,
        periodId: P1_ID,
        teachingGroupId: TG1_ID,
        sectionId: null,
        teacherPersonId: TCH1_ID,
        venueId: VEN1_ID,
      },
    ];
    const labels = {
      teachingGroups: new Map([
        [TG1_ID, "TG-MATH · Applied Math"],
        [TG2_ID, "TG-CS · Computer Science"],
      ]),
      sections: new Map([[SEC2_ID, "XI-A"]]),
      teachers: new Map([
        [TCH1_ID, "Dr. Meera"],
        [TCH2_ID, "Arjun CS"],
      ]),
    };

    expect(
      buildOfflineTimetableSnapshot(
        {
          id: TT_ID,
          code: "TT-T2",
          name: "Term 2 Draft",
          versionNo: 2,
          effectiveFrom: "2026-10-01",
          effectiveTo: null,
          status: "draft",
          isOfflineCacheable: true,
        },
        periods,
        venues,
        slots,
        labels,
      ),
    ).toBeNull();

    expect(
      buildOfflineTimetableSnapshot(
        {
          id: TT_ID,
          code: "TT-T2",
          name: "Term 2 Private",
          versionNo: 1,
          effectiveFrom: "2026-10-01",
          effectiveTo: null,
          status: "published",
          isOfflineCacheable: false,
        },
        periods,
        venues,
        slots,
        labels,
      ),
    ).toBeNull();

    const snapshot = buildOfflineTimetableSnapshot(
      {
        id: TT_ID,
        code: "TT-T2",
        name: "Term 2 Master",
        versionNo: 1,
        effectiveFrom: "2026-10-01",
        effectiveTo: "2027-03-31",
        status: "published",
        isOfflineCacheable: true,
      },
      periods,
      venues,
      slots,
      labels,
    );

    expect(snapshot).not.toBeNull();
    expect(snapshot?.periods.map((p) => p.code)).toEqual(["P1", "P2"]);
    expect(snapshot?.slots).toEqual([
      {
        dayOfWeek: 1,
        periodId: P1_ID,
        groupLabel: "TG-MATH · Applied Math",
        teacherName: "Dr. Meera",
        venueLabel: "RM-XI-A — XI-A Homeroom",
      },
      {
        dayOfWeek: 1,
        periodId: P2_ID,
        groupLabel: "TG-CS · Computer Science",
        teacherName: "Arjun CS",
        venueLabel: "RM-XI-A — XI-A Homeroom",
      },
    ]);

    const firstSlot = slots[0]!;
    const hugeSlots = Array.from(
      { length: MAX_OFFLINE_TIMETABLE_SLOTS + 25 },
      () => firstSlot,
    );
    const capped = buildOfflineTimetableSnapshot(
      {
        id: TT_ID,
        code: "TT-T2",
        name: "Term 2 Master",
        versionNo: 1,
        effectiveFrom: "2026-10-01",
        effectiveTo: null,
        status: "published",
        isOfflineCacheable: true,
      },
      periods,
      venues,
      hugeSlots,
      labels,
    );
    expect(capped?.slots.length).toBe(MAX_OFFLINE_TIMETABLE_SLOTS);
  });
});

describe("timetable & calendar Zod validation schemas", () => {
  it("enforces period endTime > startTime and timetable effectiveTo >= effectiveFrom", () => {
    expect(
      createTimetablePeriodSchema.safeParse({
        code: "P1",
        label: "Period 1",
        periodKind: "instructional",
        sequenceNo: 1,
        startTime: "09:15",
        endTime: "09:00",
      }).success,
    ).toBe(false);

    expect(
      createTimetablePeriodSchema.safeParse({
        code: "P1",
        label: "Period 1",
        periodKind: "instructional",
        sequenceNo: 1,
        startTime: "08:30",
        endTime: "09:15",
      }).success,
    ).toBe(true);

    expect(
      createTimetableSchema.safeParse({
        code: "TT-T2",
        name: "Term 2",
        versionNo: 1,
        effectiveFrom: "2026-10-15",
        effectiveTo: "2026-10-01",
        initialStatus: "draft",
      }).success,
    ).toBe(false);
  });

  it("enforces slot target requirement and calendar scopeType target matching", () => {
    expect(
      createTimetableSlotSchema.safeParse({
        timetableId: TT_ID,
        dayOfWeek: 1,
        periodId: P1_ID,
        teachingGroupId: "",
        sectionId: "",
      }).success,
    ).toBe(false);

    expect(
      createCalendarEventSchema.safeParse({
        scopeType: "institution",
        departmentId: DEPT_ID,
        sectionId: "",
        eventKind: "holiday",
        title: "Invalid Institution Event",
        startsOn: "2026-12-01",
        endsOn: "2026-12-01",
      }).success,
    ).toBe(false);

    expect(
      createCalendarEventSchema.safeParse({
        scopeType: "department",
        departmentId: "",
        sectionId: "",
        eventKind: "deadline",
        title: "Missing Department ID",
        startsOn: "2026-12-01",
        endsOn: "2026-12-01",
      }).success,
    ).toBe(false);

    expect(
      createCalendarEventSchema.safeParse({
        scopeType: "section",
        departmentId: "",
        sectionId: SEC1_ID,
        eventKind: "parent_meeting",
        title: "XI-A PTM",
        startsOn: "2026-12-10",
        endsOn: "2026-12-10",
        isNonInstructional: false,
        status: "published",
      }).success,
    ).toBe(true);
  });
});
