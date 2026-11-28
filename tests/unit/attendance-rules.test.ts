import { describe, expect, it } from "vitest";
import {
  buildAttendanceIdempotencyKey,
  canTransitionStaffVerification,
  canTransitionStudentVerification,
  computeAttendanceShortage,
  mapStaffStatusToEventStatus,
  normalizeAttendanceTimestamp,
  requiresCorrectionReason,
  summarizeStudentDailyRecords,
} from "@/lib/attendance/rules";
import {
  correctStaffAttendanceSchema,
  correctStudentAttendanceSchema,
  markStudentDailyRollSchema,
  offlineSyncBatchSchema,
  updateAttendancePolicySchema,
} from "@/lib/attendance/schemas";

const INST_ID = "11111111-1111-4111-8111-111111111101";
const SECTION_ID = "99999999-9999-4999-8999-999999994101";
const STUDENT_ID = "88888888-8888-4888-8888-888888880101";
const ENROL_ID = "99999999-9999-4999-8999-999999998101";
const TG_ID = "99999999-9999-4999-8999-999999999101";
const STAFF_ID = "88888888-8888-4888-8888-888888881101";
const ROW_ID = "cccccccc-cccc-4ccc-8ccc-cccccccc2102";

describe("attendance verification state machine and correction rules", () => {
  it("enforces one-way student verification progression and blocks downgrades", () => {
    expect(
      canTransitionStudentVerification("draft", "class_teacher_verified"),
    ).toBe(true);
    expect(
      canTransitionStudentVerification("class_teacher_verified", "signed_off"),
    ).toBe(true);
    expect(canTransitionStudentVerification("draft", "signed_off")).toBe(false);
    expect(
      canTransitionStudentVerification("draft", "signed_off", {
        allowPrincipalOverride: true,
      }),
    ).toBe(true);

    // Blocked downgrades & no-ops
    expect(
      canTransitionStudentVerification("signed_off", "class_teacher_verified"),
    ).toBe(false);
    expect(canTransitionStudentVerification("signed_off", "draft")).toBe(false);
    expect(
      canTransitionStudentVerification("class_teacher_verified", "draft"),
    ).toBe(false);
    expect(canTransitionStudentVerification("draft", "draft")).toBe(false);
  });

  it("enforces one-way staff verification progression and blocks downgrades", () => {
    expect(canTransitionStaffVerification("draft", "verified")).toBe(true);
    expect(canTransitionStaffVerification("verified", "signed_off")).toBe(true);
    expect(canTransitionStaffVerification("draft", "signed_off")).toBe(false);
    expect(
      canTransitionStaffVerification("draft", "signed_off", {
        allowPrincipalOverride: true,
      }),
    ).toBe(true);

    expect(canTransitionStaffVerification("signed_off", "verified")).toBe(false);
    expect(canTransitionStaffVerification("verified", "draft")).toBe(false);
  });

  it("requires correction reason strictly after signed_off", () => {
    expect(requiresCorrectionReason("signed_off")).toBe(true);
    expect(requiresCorrectionReason("draft")).toBe(false);
    expect(requiresCorrectionReason("class_teacher_verified")).toBe(false);
    expect(requiresCorrectionReason("verified")).toBe(false);
  });

  it("maps staff on_leave status to attendance_events excused_leave", () => {
    expect(mapStaffStatusToEventStatus("on_leave")).toBe("excused_leave");
    expect(mapStaffStatusToEventStatus("present")).toBe("present");
    expect(mapStaffStatusToEventStatus("on_duty")).toBe("on_duty");
  });
});

describe("configurable shortage calculation and deterministic keys", () => {
  it("returns no_data when total marked days is zero", () => {
    expect(
      computeAttendanceShortage(
        { presentCount: 0, absentCount: 0 },
        { minimumAttendancePercent: 75, warningThresholdPercent: 80 },
      ),
    ).toEqual({
      percentage: null,
      weightedPresent: 0,
      totalMarked: 0,
      status: "no_data",
    });
  });

  it("computes healthy, warning, and shortage strictly against configurable policy", () => {
    // 7 present + 1 late + 1 on_duty + 1 half_day = 9.5 / 12 = 79.17%
    const counts = {
      presentCount: 7,
      lateCount: 1,
      onDutyCount: 1,
      halfDayCount: 1,
      excusedLeaveCount: 1,
      absentCount: 1,
    };

    const defaultPolicyResult = computeAttendanceShortage(counts, {
      minimumAttendancePercent: 75,
      warningThresholdPercent: 80,
    });
    expect(defaultPolicyResult.weightedPresent).toBe(9.5);
    expect(defaultPolicyResult.totalMarked).toBe(12);
    expect(defaultPolicyResult.percentage).toBe(79.17);
    expect(defaultPolicyResult.status).toBe("warning");

    // Stricter custom institutional threshold marks 79.17% as shortage
    const strictResult = computeAttendanceShortage(counts, {
      minimumAttendancePercent: 85,
      warningThresholdPercent: 90,
    });
    expect(strictResult.status).toBe("shortage");

    // Excused leave credit optional toggle bumps 9.5 -> 10.5 / 12 = 87.5%
    const creditedResult = computeAttendanceShortage(counts, {
      minimumAttendancePercent: 75,
      warningThresholdPercent: 85,
      countExcusedLeaveAsPresent: true,
    });
    expect(creditedResult.percentage).toBe(87.5);
    expect(creditedResult.status).toBe("healthy");
  });

  it("summarizes array of student daily statuses accurately", () => {
    const summary = summarizeStudentDailyRecords(
      ["present", "present", "half_day", "absent"],
      { minimumAttendancePercent: 75, warningThresholdPercent: 80 },
    );
    expect(summary.totalMarked).toBe(4);
    expect(summary.weightedPresent).toBe(2.5);
    expect(summary.percentage).toBe(62.5);
    expect(summary.status).toBe("shortage");
  });

  it("builds deterministic idempotency keys and normalizes timestamps", () => {
    const k1 = buildAttendanceIdempotencyKey({
      institutionId: INST_ID,
      scope: "day_roll",
      targetId: STUDENT_ID,
      attendanceDate: "2026-11-28",
      qualifier: "XI-A Present",
      source: "offline_queue",
    });
    const k2 = buildAttendanceIdempotencyKey({
      institutionId: INST_ID,
      scope: "day_roll",
      targetId: STUDENT_ID,
      attendanceDate: "2026-11-28",
      qualifier: "XI-A Present",
      source: "offline_queue",
    });
    expect(k1).toBe(k2);
    expect(k1).toMatch(/^offline_queue:day_roll:/);
    expect(normalizeAttendanceTimestamp("2026-11-28", "08:15")).toBe(
      "2026-11-28T08:15:00+05:30",
    );
    expect(normalizeAttendanceTimestamp("2026-11-28", "   ")).toBeUndefined();
  });
});

describe("attendance Zod schema validation", () => {
  it("rejects short or missing correction reasons for student and staff corrections", () => {
    expect(
      correctStudentAttendanceSchema.safeParse({
        attendanceId: ROW_ID,
        newStatus: "present",
        correctionReason: "  ok  ",
      }).success,
    ).toBe(false);

    expect(
      correctStaffAttendanceSchema.safeParse({
        attendanceId: ROW_ID,
        newStatus: "on_duty",
        correctionReason: "",
      }).success,
    ).toBe(false);

    expect(
      correctStudentAttendanceSchema.safeParse({
        attendanceId: ROW_ID,
        newStatus: "excused_leave",
        correctionReason: "Approved medical documentation filed in office",
      }).success,
    ).toBe(true);
  });

  it("rejects invalid calendar dates on daily roll", () => {
    expect(
      markStudentDailyRollSchema.safeParse({
        sectionId: SECTION_ID,
        attendanceDate: "2026-02-30",
        entries: [
          {
            studentEnrolmentId: ENROL_ID,
            studentProfileId: STUDENT_ID,
            status: "present",
          },
        ],
      }).success,
    ).toBe(false);
  });

  it("rejects warning threshold below minimum and rejects biometricEnabled property injection", () => {
    expect(
      updateAttendancePolicySchema.safeParse({
        minimumAttendancePercent: 85,
        warningThresholdPercent: 80,
        periodAttendanceEnabled: false,
      }).success,
    ).toBe(false);

    expect(
      updateAttendancePolicySchema.safeParse({
        minimumAttendancePercent: 75,
        warningThresholdPercent: 80,
        periodAttendanceEnabled: true,
        biometricEnabled: true,
      }).success,
    ).toBe(false);

    expect(
      updateAttendancePolicySchema.safeParse({
        minimumAttendancePercent: 75,
        warningThresholdPercent: 80,
        periodAttendanceEnabled: true,
        policyNotes: "CBSE baseline pending circular verification",
      }).success,
    ).toBe(true);
  });

  it("validates offline-queue sync batch constraints strictly", () => {
    // Missing sectionId for day_roll
    expect(
      offlineSyncBatchSchema.safeParse({
        events: [
          {
            idempotencyKey: "offline_queue:day_roll:12345678",
            subjectKind: "student",
            studentProfileId: STUDENT_ID,
            attendanceDate: "2026-11-28",
            eventType: "day_roll",
            attendanceStatus: "present",
            occurredAt: "2026-11-28T08:00:00+05:30",
            source: "offline_queue",
          },
        ],
      }).success,
    ).toBe(false);

    // Dual student + staff targets rejected
    expect(
      offlineSyncBatchSchema.safeParse({
        events: [
          {
            idempotencyKey: "offline_queue:day_roll:12345678",
            subjectKind: "student",
            studentProfileId: STUDENT_ID,
            staffProfileId: STAFF_ID,
            sectionId: SECTION_ID,
            attendanceDate: "2026-11-28",
            eventType: "day_roll",
            attendanceStatus: "present",
            occurredAt: "2026-11-28T08:00:00+05:30",
            source: "offline_queue",
          },
        ],
      }).success,
    ).toBe(false);

    // Period roll without periodCode rejected
    expect(
      offlineSyncBatchSchema.safeParse({
        events: [
          {
            idempotencyKey: "offline_queue:period_roll:12345678",
            subjectKind: "student",
            studentProfileId: STUDENT_ID,
            teachingGroupId: TG_ID,
            attendanceDate: "2026-11-28",
            eventType: "period_roll",
            attendanceStatus: "present",
            occurredAt: "2026-11-28T09:00:00+05:30",
            source: "offline_queue",
          },
        ],
      }).success,
    ).toBe(false);

    // Valid day_roll + period_roll offline batch
    expect(
      offlineSyncBatchSchema.safeParse({
        events: [
          {
            idempotencyKey: "offline_queue:day_roll:aarav:2026-11-28",
            subjectKind: "student",
            studentProfileId: STUDENT_ID,
            studentEnrolmentId: ENROL_ID,
            sectionId: SECTION_ID,
            attendanceDate: "2026-11-28",
            eventType: "day_roll",
            attendanceStatus: "present",
            occurredAt: "2026-11-28T08:05:00+05:30",
            source: "offline_queue",
          },
          {
            idempotencyKey: "offline_queue:period_roll:aarav:p1:2026-11-28",
            subjectKind: "student",
            studentProfileId: STUDENT_ID,
            studentEnrolmentId: ENROL_ID,
            teachingGroupId: TG_ID,
            periodCode: "P1",
            attendanceDate: "2026-11-28",
            eventType: "period_roll",
            attendanceStatus: "present",
            occurredAt: "2026-11-28T09:10:00+05:30",
            source: "offline_queue",
          },
        ],
      }).success,
    ).toBe(true);
  });
});
