import { describe, expect, it } from "vitest";
import {
  calculateInclusiveLeaveDays,
  canAcknowledgeParentNotice,
  canReviewLeaveRecord,
  canTransitionLeaveStatus,
  summarizeDailyClassAttendance,
} from "@/lib/leave/rules";
import {
  acknowledgeParentNoticeSchema,
  reviewLeaveApplicationSchema,
  submitParentNoticeSchema,
  submitStaffLeaveSchema,
  submitStudentLeaveSchema,
} from "@/lib/leave/schemas";

const STUDENT_ID = "88888888-8888-4888-8888-888888880101";
const LEAVE_ID = "cccccccc-cccc-4ccc-8ccc-cccccccc4101";
const NOTICE_ID = "cccccccc-cccc-4ccc-8ccc-cccccccc5101";

describe("leave inclusive day calculation and state transitions", () => {
  it("calculates single-day and multi-day inclusive durations cleanly", () => {
    expect(calculateInclusiveLeaveDays("2026-12-02", "2026-12-02")).toBe(1);
    expect(calculateInclusiveLeaveDays("2026-12-02", "2026-12-04")).toBe(3);
  });

  it("throws on invalid calendar dates or reversed date ranges", () => {
    expect(() =>
      calculateInclusiveLeaveDays("2026-12-05", "2026-12-02"),
    ).toThrow();
    expect(() =>
      calculateInclusiveLeaveDays("2026-02-30", "2026-03-01"),
    ).toThrow();
  });

  it("enforces valid transitions and locks terminal states", () => {
    expect(canTransitionLeaveStatus("submitted", "approved", "reviewer")).toBe(
      true,
    );
    expect(canTransitionLeaveStatus("submitted", "rejected", "reviewer")).toBe(
      true,
    );
    expect(canTransitionLeaveStatus("submitted", "cancelled", "applicant")).toBe(
      true,
    );

    // Mismatched roles blocked
    expect(
      canTransitionLeaveStatus("submitted", "approved", "applicant"),
    ).toBe(false);
    expect(
      canTransitionLeaveStatus("submitted", "cancelled", "reviewer"),
    ).toBe(false);

    // Terminal states locked permanently
    expect(canTransitionLeaveStatus("approved", "rejected", "reviewer")).toBe(
      false,
    );
    expect(
      canTransitionLeaveStatus("approved", "cancelled", "applicant"),
    ).toBe(false);
    expect(canTransitionLeaveStatus("rejected", "approved", "reviewer")).toBe(
      false,
    );
    expect(
      canTransitionLeaveStatus("cancelled", "approved", "reviewer"),
    ).toBe(false);
  });

  it("blocks self-approval unless caller holds institutional override", () => {
    expect(
      canReviewLeaveRecord({
        isSelfApplicant: true,
        hasInstitutionalOverride: false,
        hasReviewAuthority: true,
      }),
    ).toBe(false);

    expect(
      canReviewLeaveRecord({
        isSelfApplicant: true,
        hasInstitutionalOverride: true,
        hasReviewAuthority: true,
      }),
    ).toBe(true);

    expect(
      canReviewLeaveRecord({
        isSelfApplicant: false,
        hasInstitutionalOverride: false,
        hasReviewAuthority: false,
      }),
    ).toBe(false);

    expect(
      canReviewLeaveRecord({
        isSelfApplicant: false,
        hasInstitutionalOverride: false,
        hasReviewAuthority: true,
      }),
    ).toBe(true);
  });

  it("allows parent notice acknowledgement only from submitted status", () => {
    expect(canAcknowledgeParentNotice("submitted")).toBe(true);
    expect(canAcknowledgeParentNotice("acknowledged")).toBe(false);
  });
});

describe("leave and parent notice Zod schemas", () => {
  it("rejects reversed leave date ranges for students and staff", () => {
    expect(
      submitStudentLeaveSchema.safeParse({
        studentProfileId: STUDENT_ID,
        startsOn: "2026-12-05",
        endsOn: "2026-12-03",
        leaveType: "family",
        reason: "Out of station travel with parents",
      }).success,
    ).toBe(false);

    expect(
      submitStaffLeaveSchema.safeParse({
        startsOn: "2026-12-05",
        endsOn: "2026-12-03",
        leaveType: "casual",
        reason: "Personal errands",
      }).success,
    ).toBe(false);

    expect(
      submitStudentLeaveSchema.safeParse({
        studentProfileId: STUDENT_ID,
        startsOn: "2026-12-03",
        endsOn: "2026-12-05",
        leaveType: "medical",
        reason: "Dental surgery recovery",
      }).success,
    ).toBe(true);
  });

  it("requires a >= 3-char decisionNote on rejection while allowing optional note on approval", () => {
    expect(
      reviewLeaveApplicationSchema.safeParse({
        leaveId: LEAVE_ID,
        decision: "rejected",
      }).success,
    ).toBe(false);

    expect(
      reviewLeaveApplicationSchema.safeParse({
        leaveId: LEAVE_ID,
        decision: "rejected",
        decisionNote: "No",
      }).success,
    ).toBe(false);

    expect(
      reviewLeaveApplicationSchema.safeParse({
        leaveId: LEAVE_ID,
        decision: "rejected",
        decisionNote: "Pre-board practical scheduled on same date",
      }).success,
    ).toBe(true);

    expect(
      reviewLeaveApplicationSchema.safeParse({
        leaveId: LEAVE_ID,
        decision: "approved",
      }).success,
    ).toBe(true);
  });

  it("validates parent notice submission and acknowledgement payloads", () => {
    expect(
      submitParentNoticeSchema.safeParse({
        studentProfileId: STUDENT_ID,
        attendanceDate: "2026-11-28",
        noticeKind: "late_arrival",
        message: "ok",
      }).success,
    ).toBe(false);

    expect(
      submitParentNoticeSchema.safeParse({
        studentProfileId: STUDENT_ID,
        attendanceDate: "2026-11-28",
        noticeKind: "early_pickup",
        message: "Father picking up at 12:30 PM after math exam",
      }).success,
    ).toBe(true);

    expect(
      acknowledgeParentNoticeSchema.safeParse({
        noticeId: NOTICE_ID,
      }).success,
    ).toBe(true);
  });
});

describe("summarizeDailyClassAttendance Monitor verified-only filtering", () => {
  const sampleRows = [
    {
      id: "r1",
      status: "present" as const,
      verificationStatus: "signed_off" as const,
    },
    {
      id: "r2",
      status: "absent" as const,
      verificationStatus: "class_teacher_verified" as const,
    },
    {
      id: "r3",
      status: "late" as const,
      verificationStatus: "draft" as const,
    },
    {
      id: "r4",
      status: null,
      verificationStatus: null,
    },
  ];

  it("strictly strips all draft and unmarked rows when verifiedOnly is true", () => {
    const monitorView = summarizeDailyClassAttendance(sampleRows, {
      verifiedOnly: true,
    });
    expect(monitorView.rows.map((r) => r.id)).toEqual(["r1", "r2"]);
    expect(monitorView.presentCount).toBe(1);
    expect(monitorView.absentCount).toBe(1);
    expect(monitorView.lateCount).toBe(0);
    expect(monitorView.draftCount).toBe(0);
    expect(monitorView.verifiedCount).toBe(1);
    expect(monitorView.signedOffCount).toBe(1);
    expect(monitorView.totalMarked).toBe(2);
  });

  it("includes draft + verified + signed_off breakdowns when verifiedOnly is false", () => {
    const staffView = summarizeDailyClassAttendance(sampleRows, {
      verifiedOnly: false,
    });
    expect(staffView.rows).toHaveLength(4);
    expect(staffView.presentCount).toBe(1);
    expect(staffView.absentCount).toBe(1);
    expect(staffView.lateCount).toBe(1);
    expect(staffView.draftCount).toBe(1);
    expect(staffView.verifiedCount).toBe(1);
    expect(staffView.signedOffCount).toBe(1);
    expect(staffView.totalMarked).toBe(3);
  });
});
