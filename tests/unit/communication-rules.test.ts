import { describe, expect, it } from "vitest";
import {
  buildWhatsAppClickToChatUrl,
  canPostInternalStaffNote,
  canTransitionEnquiryStatus,
  canTransitionNoticeStatus,
  filterCacheablePublishedNotices,
  resolveNoticeAuthoringPolicy,
  validateNoticeAuthoringAgainstPolicy,
} from "@/lib/communication/rules";
import {
  acknowledgeNoticeSchema,
  createOfficialNoticeSchema,
  createParentEnquirySchema,
  createRecordCommentSchema,
  updateParentEnquirySchema,
} from "@/lib/communication/schemas";

const DEPT_ID = "99999999-9999-4999-8999-999999992101";
const SEC_ID = "99999999-9999-4999-8999-999999994101";
const TG_ID = "99999999-9999-4999-8999-999999999101";
const OTHER_TG_ID = "99999999-9999-4999-8999-999999999102";
const STUDENT_ID = "88888888-8888-4888-8888-888888880101";
const ENQUIRY_ID = "dddddddd-dddd-4ddd-8ddd-dddddddd7101";
const NOTICE_ID = "dddddddd-dddd-4ddd-8ddd-dddddddd6101";

describe("notice authoring policy and scope validation", () => {
  it("grants Leadership full scope while restricting Subject Teacher to assigned TGs", () => {
    const leadershipPolicy = resolveNoticeAuthoringPolicy({
      isLeadership: true,
      hodDepartmentIds: [],
      classTeacherSectionIds: [],
      subjectTeacherGroupIds: [],
    });
    expect(leadershipPolicy.canCreateNotice).toBe(true);
    expect(leadershipPolicy.allowedScopes).toEqual([
      "institution",
      "department",
      "section",
      "teaching_group",
    ]);

    const hodPolicy = resolveNoticeAuthoringPolicy({
      isLeadership: false,
      hodDepartmentIds: [DEPT_ID],
      classTeacherSectionIds: [],
      subjectTeacherGroupIds: [],
    });
    expect(hodPolicy.allowedScopes).toEqual(["department"]);
    expect(
      validateNoticeAuthoringAgainstPolicy(
        { scopeType: "department", departmentId: DEPT_ID },
        hodPolicy,
      ),
    ).toEqual({ ok: true });

    const ctPolicy = resolveNoticeAuthoringPolicy({
      isLeadership: false,
      hodDepartmentIds: [],
      classTeacherSectionIds: [SEC_ID],
      subjectTeacherGroupIds: [],
    });
    expect(ctPolicy.allowedScopes).toEqual(["section"]);
    expect(
      validateNoticeAuthoringAgainstPolicy(
        { scopeType: "section", sectionId: SEC_ID },
        ctPolicy,
      ),
    ).toEqual({ ok: true });

    const subjectTeacherPolicy = resolveNoticeAuthoringPolicy({
      isLeadership: false,
      hodDepartmentIds: [],
      classTeacherSectionIds: [],
      subjectTeacherGroupIds: [TG_ID],
    });
    expect(subjectTeacherPolicy.allowedScopes).toEqual(["teaching_group"]);
    expect(
      validateNoticeAuthoringAgainstPolicy(
        { scopeType: "teaching_group", teachingGroupId: TG_ID },
        subjectTeacherPolicy,
      ),
    ).toEqual({ ok: true });

    // Reject institution broadcast & unassigned teaching group
    expect(
      validateNoticeAuthoringAgainstPolicy(
        { scopeType: "institution" },
        subjectTeacherPolicy,
      ).ok,
    ).toBe(false);
    expect(
      validateNoticeAuthoringAgainstPolicy(
        { scopeType: "teaching_group", teachingGroupId: OTHER_TG_ID },
        subjectTeacherPolicy,
      ).ok,
    ).toBe(false);

    // Monitors and Guardians cannot author notices
    const emptyPolicy = resolveNoticeAuthoringPolicy({
      isLeadership: false,
      hodDepartmentIds: [],
      classTeacherSectionIds: [],
      subjectTeacherGroupIds: [],
    });
    expect(emptyPolicy.canCreateNotice).toBe(false);
    expect(
      validateNoticeAuthoringAgainstPolicy(
        { scopeType: "institution" },
        emptyPolicy,
      ).ok,
    ).toBe(false);
  });

  it("enforces exact scope_type target binding in createOfficialNoticeSchema", () => {
    expect(
      createOfficialNoticeSchema.safeParse({
        scopeType: "institution",
        departmentId: DEPT_ID,
        category: "general",
        title: "Invalid Target Notice",
        body: "Institution notice cannot specify a departmentId.",
        requiresAcknowledgement: false,
        isOfflineCacheable: false,
        initialStatus: "published",
      }).success,
    ).toBe(false);

    expect(
      createOfficialNoticeSchema.safeParse({
        scopeType: "teaching_group",
        teachingGroupId: TG_ID,
        category: "academic",
        title: "Valid TG Notice",
        body: "Math seminar room updated for Friday session.",
        requiresAcknowledgement: false,
        isOfflineCacheable: true,
        initialStatus: "published",
      }).success,
    ).toBe(true);
  });
});

describe("status transitions, enquiry triage, comments, WhatsApp & offline cache", () => {
  it("enforces one-way notice and parent enquiry state transitions", () => {
    expect(canTransitionNoticeStatus("draft", "published")).toBe(true);
    expect(canTransitionNoticeStatus("draft", "archived")).toBe(true);
    expect(canTransitionNoticeStatus("published", "archived")).toBe(true);
    expect(canTransitionNoticeStatus("archived", "published")).toBe(false);

    expect(canTransitionEnquiryStatus("open", "in_review")).toBe(true);
    expect(canTransitionEnquiryStatus("open", "resolved")).toBe(true);
    expect(canTransitionEnquiryStatus("in_review", "resolved")).toBe(true);
    expect(canTransitionEnquiryStatus("resolved", "closed")).toBe(true);
    expect(canTransitionEnquiryStatus("closed", "open")).toBe(false);
    expect(canTransitionEnquiryStatus("closed", "resolved")).toBe(false);
  });

  it("requires resolutionSummary when resolving parent enquiry and validates comment payloads", () => {
    expect(
      updateParentEnquirySchema.safeParse({
        enquiryId: ENQUIRY_ID,
        targetStatus: "resolved",
        resolutionSummary: "Ok",
      }).success,
    ).toBe(false);

    expect(
      updateParentEnquirySchema.safeParse({
        enquiryId: ENQUIRY_ID,
        targetStatus: "resolved",
        resolutionSummary: "Confirmed pickup stop at 07:40 AM with transport desk.",
      }).success,
    ).toBe(true);

    expect(
      createParentEnquirySchema.safeParse({
        studentProfileId: STUDENT_ID,
        category: "academic",
        subject: "A",
        body: "Valid body",
      }).success,
    ).toBe(false);

    expect(
      createRecordCommentSchema.safeParse({
        parentKind: "notice",
        parentId: NOTICE_ID,
        body: "Clarification note posted.",
        isInternalStaffNote: true,
      }).success,
    ).toBe(true);

    expect(
      acknowledgeNoticeSchema.safeParse({
        noticeId: NOTICE_ID,
      }).success,
    ).toBe(true);
  });

  it("restricts internal staff notes and builds sanitized click-to-chat URLs", () => {
    expect(canPostInternalStaffNote({ isStaffOrLeadership: true })).toBe(true);
    expect(canPostInternalStaffNote({ isStaffOrLeadership: false })).toBe(false);

    expect(
      buildWhatsAppClickToChatUrl({
        phone: "+91 98765-43210",
        prefillText: "Regarding DD-oodle Enquiry #1",
      }),
    ).toBe(
      "https://wa.me/919876543210?text=Regarding%20DD-oodle%20Enquiry%20%231",
    );
    expect(
      buildWhatsAppClickToChatUrl({ phone: "12345", prefillText: "Hi" }),
    ).toBeNull();
    expect(buildWhatsAppClickToChatUrl({ phone: null })).toBeNull();
  });

  it("filters ONLY published & offline-cacheable notices for controlled client storage", () => {
    const filtered = filterCacheablePublishedNotices([
      {
        id: "1",
        title: "Draft Cacheable",
        body: "Should stay excluded because draft.",
        category: "general",
        scopeType: "institution",
        status: "draft",
        isOfflineCacheable: true,
        publishedAt: null,
      },
      {
        id: "2",
        title: "Published Non-Cacheable",
        body: "Should stay excluded.",
        category: "academic",
        scopeType: "section",
        status: "published",
        isOfflineCacheable: false,
        publishedAt: "2026-11-28T05:00:00Z",
      },
      {
        id: "3",
        title: "Winter Timetable",
        body: "Published offline notice.",
        category: "exam",
        scopeType: "institution",
        status: "published",
        isOfflineCacheable: true,
        publishedAt: "2026-11-28T04:00:00Z",
      },
    ]);

    expect(filtered).toEqual([
      {
        id: "3",
        title: "Winter Timetable",
        body: "Published offline notice.",
        category: "exam",
        scopeType: "institution",
        publishedAt: "2026-11-28T04:00:00Z",
      },
    ]);
  });
});
