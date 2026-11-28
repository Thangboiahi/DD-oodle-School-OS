import { describe, expect, it } from "vitest";
import {
  buildMonitorBoardAssignmentView,
  canStudentSubmitAssignment,
  canTransitionAssignmentStatus,
  computeAssignmentCompletionMetrics,
  determineSubmissionStatus,
  sanitizeObjectiveQuestionsForLearner,
  scoreObjectiveQuiz,
} from "@/lib/assignments/rules";
import {
  createAssignmentSchema,
  objectiveQuestionSchema,
  submitStudentAssignmentSchema,
  type ObjectiveQuestion,
} from "@/lib/assignments/schemas";

const TG_ID = "99999999-9999-4999-8999-999999999101";

const SAMPLE_QUESTIONS: ObjectiveQuestion[] = [
  {
    id: "q1",
    prompt: "Which organ pumps blood across the human body?",
    options: ["Lungs", "Heart", "Liver"],
    correctOptionIndex: 1,
    marks: 2,
  },
  {
    id: "q2",
    prompt: "What is the SI unit of electric current?",
    options: ["Volt", "Ampere", "Ohm"],
    correctOptionIndex: 1,
    marks: 3,
  },
];

describe("assignments pure domain rules", () => {
  it("scores objective MCQ quizzes accurately across full, partial, and missing answers", () => {
    const full = scoreObjectiveQuiz(SAMPLE_QUESTIONS, { q1: 1, q2: 1 });
    expect(full.totalMarks).toBe(5);
    expect(full.marksAwarded).toBe(5);
    expect(full.correctCount).toBe(2);
    expect(full.totalQuestions).toBe(2);

    const partial = scoreObjectiveQuiz(SAMPLE_QUESTIONS, { q1: 1, q2: 0 });
    expect(partial.marksAwarded).toBe(2);
    expect(partial.correctCount).toBe(1);
    expect(partial.breakdown[1]?.isCorrect).toBe(false);

    const missing = scoreObjectiveQuiz(SAMPLE_QUESTIONS, {});
    expect(missing.marksAwarded).toBe(0);
    expect(missing.correctCount).toBe(0);
    expect(missing.breakdown[0]?.selectedOptionIndex).toBeNull();
  });

  it("determines on-time, late-allowed, and late-blocked submission status", () => {
    const dueAt = "2026-12-01T10:00:00.000Z";
    expect(
      determineSubmissionStatus({
        submittedAt: "2026-12-01T09:55:00.000Z",
        dueAt,
        allowLateSubmission: false,
      }),
    ).toEqual({ ok: true, status: "submitted" });

    expect(
      determineSubmissionStatus({
        submittedAt: "2026-12-01T10:05:00.000Z",
        dueAt,
        allowLateSubmission: true,
      }),
    ).toEqual({ ok: true, status: "late_submitted" });

    expect(
      determineSubmissionStatus({
        submittedAt: "2026-12-01T10:05:00.000Z",
        dueAt,
        allowLateSubmission: false,
      }).ok,
    ).toBe(false);
  });

  it("enforces one-way assignment status lifecycle transitions", () => {
    expect(canTransitionAssignmentStatus("draft", "published")).toBe(true);
    expect(canTransitionAssignmentStatus("draft", "archived")).toBe(true);
    expect(canTransitionAssignmentStatus("draft", "closed")).toBe(false);
    expect(canTransitionAssignmentStatus("published", "closed")).toBe(true);
    expect(canTransitionAssignmentStatus("closed", "published")).toBe(false);
    expect(canTransitionAssignmentStatus("archived", "published")).toBe(false);
  });

  it("controls student submission eligibility across mode, status, and resubmit requests", () => {
    expect(
      canStudentSubmitAssignment({
        assignmentStatus: "draft",
        submissionMode: "online",
        existingSubmissionStatus: null,
        dueAt: null,
        allowLateSubmission: true,
      }).allowed,
    ).toBe(false);

    expect(
      canStudentSubmitAssignment({
        assignmentStatus: "published",
        submissionMode: "offline",
        existingSubmissionStatus: null,
        dueAt: null,
        allowLateSubmission: true,
      }).allowed,
    ).toBe(false);

    expect(
      canStudentSubmitAssignment({
        assignmentStatus: "published",
        submissionMode: "both",
        existingSubmissionStatus: "resubmit_requested",
        dueAt: null,
        allowLateSubmission: true,
      }),
    ).toEqual({ allowed: true, nextStatus: "submitted" });

    expect(
      canStudentSubmitAssignment({
        assignmentStatus: "published",
        submissionMode: "online",
        existingSubmissionStatus: "evaluated",
        dueAt: null,
        allowLateSubmission: true,
      }).allowed,
    ).toBe(false);
  });

  it("strips MCQ correctOptionIndex until revealAnswerKey is explicitly true", () => {
    const hidden = sanitizeObjectiveQuestionsForLearner(SAMPLE_QUESTIONS, {
      revealAnswerKey: false,
    });
    expect("correctOptionIndex" in hidden[0]!).toBe(false);
    expect(hidden[0]?.correctOptionIndex).toBeUndefined();

    const revealed = sanitizeObjectiveQuestionsForLearner(SAMPLE_QUESTIONS, {
      revealAnswerKey: true,
    });
    expect(revealed[0]?.correctOptionIndex).toBe(1);
    expect(revealed[1]?.correctOptionIndex).toBe(1);
  });

  it("projects strictly published assignments for Monitor Classroom Board and calculates completion metrics", () => {
    const board = buildMonitorBoardAssignmentView([
      {
        id: "1",
        title: "Published Work",
        teachingGroupLabel: "TG-MATH",
        subjectLabel: "Mathematics",
        assignmentType: "homework",
        submissionMode: "both",
        status: "published",
        dueAt: null,
        maxMarks: 10,
      },
      {
        id: "2",
        title: "Secret Draft",
        teachingGroupLabel: "TG-MATH",
        subjectLabel: "Mathematics",
        assignmentType: "quiz",
        submissionMode: "online",
        status: "draft",
        dueAt: null,
        maxMarks: 5,
      },
    ]);
    expect(board).toHaveLength(1);
    expect(board[0]?.title).toBe("Published Work");

    const metrics = computeAssignmentCompletionMetrics(5, [
      { status: "submitted" },
      { status: "late_submitted" },
      { status: "completed_offline" },
      { status: "evaluated" },
      { status: "resubmit_requested" },
    ]);
    expect(metrics).toEqual({
      totalEnrolled: 5,
      submittedCount: 1,
      lateCount: 1,
      offlineCompletedCount: 1,
      evaluatedCount: 1,
      resubmitRequestedCount: 1,
      pendingCount: 1,
      completionPercent: 80,
    });
  });

  it("validates auto_mcq question requirements and rejects path traversal in attachmentStoragePath", () => {
    expect(
      objectiveQuestionSchema.safeParse({
        id: "q1",
        prompt: "Valid question?",
        options: ["A", "B"],
        correctOptionIndex: 2,
        marks: 1,
      }).success,
    ).toBe(false);

    expect(
      createAssignmentSchema.safeParse({
        teachingGroupId: TG_ID,
        title: "Auto Quiz Without Questions",
        instructions: "Answer all questions online.",
        assignmentType: "quiz",
        submissionMode: "online",
        evaluationMode: "auto_mcq",
        objectiveQuestions: [],
      }).success,
    ).toBe(false);

    expect(
      createAssignmentSchema.safeParse({
        teachingGroupId: TG_ID,
        title: "Valid Auto Quiz",
        instructions: "Choose the single best option.",
        assignmentType: "quiz",
        submissionMode: "online",
        evaluationMode: "auto_mcq",
        objectiveQuestions: SAMPLE_QUESTIONS,
        initialStatus: "published",
      }).success,
    ).toBe(true);

    expect(
      submitStudentAssignmentSchema.safeParse({
        assignmentId: TG_ID,
        responseText: "Attached sheet",
        attachmentStoragePath: "../secret/file.pdf",
      }).success,
    ).toBe(false);

    expect(
      submitStudentAssignmentSchema.safeParse({
        assignmentId: TG_ID,
        responseText: "Attached sheet",
        attachmentStoragePath: `${TG_ID}/submissions/answer.pdf`,
      }).success,
    ).toBe(true);
  });
});
