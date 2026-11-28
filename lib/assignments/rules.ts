import type {
  AssignmentStatus,
  AssignmentType,
  ObjectiveQuestion,
  SanitizedObjectiveQuestion,
  SubmissionMode,
  SubmissionStatus,
} from "@/lib/assignments/schemas";

export interface ObjectiveQuestionScoreBreakdown {
  questionId: string;
  selectedOptionIndex: number | null;
  isCorrect: boolean;
  marksEarned: number;
  maxMarks: number;
}

export interface ObjectiveQuizScoreResult {
  totalMarks: number;
  marksAwarded: number;
  correctCount: number;
  totalQuestions: number;
  breakdown: readonly ObjectiveQuestionScoreBreakdown[];
}

export function scoreObjectiveQuiz(
  questions: readonly ObjectiveQuestion[],
  answers: Readonly<Record<string, number>>,
): ObjectiveQuizScoreResult {
  let totalMarks = 0;
  let marksAwarded = 0;
  let correctCount = 0;
  const breakdown: ObjectiveQuestionScoreBreakdown[] = [];

  for (const question of questions) {
    const rawSelection = answers[question.id];
    const selectedOptionIndex =
      typeof rawSelection === "number" &&
      Number.isInteger(rawSelection) &&
      rawSelection >= 0 &&
      rawSelection < question.options.length
        ? rawSelection
        : null;
    const isCorrect =
      selectedOptionIndex !== null &&
      selectedOptionIndex === question.correctOptionIndex;
    const marksEarned = isCorrect ? question.marks : 0;

    totalMarks += question.marks;
    marksAwarded += marksEarned;
    if (isCorrect) {
      correctCount += 1;
    }

    breakdown.push({
      questionId: question.id,
      selectedOptionIndex,
      isCorrect,
      marksEarned,
      maxMarks: question.marks,
    });
  }

  return {
    totalMarks,
    marksAwarded,
    correctCount,
    totalQuestions: questions.length,
    breakdown,
  };
}

export function determineSubmissionStatus(input: {
  submittedAt: Date | string;
  dueAt: Date | string | null;
  allowLateSubmission: boolean;
}): { ok: true; status: "submitted" | "late_submitted" } | { ok: false; error: string } {
  if (!input.dueAt) {
    return { ok: true, status: "submitted" };
  }

  const submittedMs =
    input.submittedAt instanceof Date
      ? input.submittedAt.getTime()
      : Date.parse(input.submittedAt);
  const dueMs =
    input.dueAt instanceof Date ? input.dueAt.getTime() : Date.parse(input.dueAt);

  if (Number.isNaN(submittedMs) || Number.isNaN(dueMs)) {
    return { ok: false, error: "Invalid submission or due timestamp." };
  }

  if (submittedMs <= dueMs) {
    return { ok: true, status: "submitted" };
  }

  if (!input.allowLateSubmission) {
    return {
      ok: false,
      error: "The deadline has passed and late submissions are disabled for this assignment.",
    };
  }

  return { ok: true, status: "late_submitted" };
}

export function canTransitionAssignmentStatus(
  current: AssignmentStatus,
  target: "published" | "closed" | "archived",
): boolean {
  if (current === "archived") {
    return false;
  }
  if (current === "draft") {
    return target === "published" || target === "archived";
  }
  if (current === "published") {
    return target === "closed" || target === "archived";
  }
  if (current === "closed") {
    return target === "archived";
  }
  return false;
}

export function canStudentSubmitAssignment(input: {
  assignmentStatus: AssignmentStatus;
  submissionMode: SubmissionMode;
  existingSubmissionStatus: SubmissionStatus | null;
  dueAt: Date | string | null;
  allowLateSubmission: boolean;
  now?: Date;
}):
  | { allowed: true; nextStatus: "submitted" | "late_submitted" }
  | { allowed: false; reason: string } {
  if (input.assignmentStatus !== "published") {
    return {
      allowed: false,
      reason: "Submissions are only open while the assignment is published.",
    };
  }

  if (input.submissionMode === "offline") {
    return {
      allowed: false,
      reason:
        "This assignment uses offline classroom/notebook completion recorded by your teacher.",
    };
  }

  if (
    input.existingSubmissionStatus &&
    input.existingSubmissionStatus !== "assigned" &&
    input.existingSubmissionStatus !== "resubmit_requested"
  ) {
    if (input.existingSubmissionStatus === "evaluated") {
      return {
        allowed: false,
        reason: "This submission has already been evaluated.",
      };
    }
    if (input.existingSubmissionStatus === "completed_offline") {
      return {
        allowed: false,
        reason: "Offline completion has already been recorded for this assignment.",
      };
    }
    return {
      allowed: false,
      reason:
        "Your online submission is already recorded and awaiting teacher evaluation.",
    };
  }

  const deadlineResult = determineSubmissionStatus({
    submittedAt: input.now ?? new Date(),
    dueAt: input.dueAt,
    allowLateSubmission: input.allowLateSubmission,
  });

  if (!deadlineResult.ok) {
    return { allowed: false, reason: deadlineResult.error };
  }

  return { allowed: true, nextStatus: deadlineResult.status };
}

export function sanitizeObjectiveQuestionsForLearner(
  questions: readonly ObjectiveQuestion[],
  options: { revealAnswerKey: boolean },
): SanitizedObjectiveQuestion[] {
  return questions.map((question) => {
    const base: SanitizedObjectiveQuestion = {
      id: question.id,
      prompt: question.prompt,
      options: [...question.options],
      marks: question.marks,
    };
    if (options.revealAnswerKey) {
      base.correctOptionIndex = question.correctOptionIndex;
    }
    return base;
  });
}

export interface MonitorBoardAssignmentSource {
  id: string;
  title: string;
  teachingGroupLabel: string;
  subjectLabel: string;
  assignmentType: AssignmentType;
  submissionMode: SubmissionMode;
  status: AssignmentStatus;
  dueAt: string | null;
  maxMarks: number | null;
}

export interface MonitorBoardAssignmentView {
  id: string;
  title: string;
  teachingGroupLabel: string;
  subjectLabel: string;
  assignmentType: AssignmentType;
  submissionMode: SubmissionMode;
  dueAt: string | null;
  maxMarks: number | null;
}

export function buildMonitorBoardAssignmentView(
  assignments: readonly MonitorBoardAssignmentSource[],
): MonitorBoardAssignmentView[] {
  return assignments
    .filter((assignment) => assignment.status === "published")
    .map((assignment) => ({
      id: assignment.id,
      title: assignment.title,
      teachingGroupLabel: assignment.teachingGroupLabel,
      subjectLabel: assignment.subjectLabel,
      assignmentType: assignment.assignmentType,
      submissionMode: assignment.submissionMode,
      dueAt: assignment.dueAt,
      maxMarks: assignment.maxMarks,
    }));
}

export interface AssignmentCompletionMetrics {
  totalEnrolled: number;
  submittedCount: number;
  lateCount: number;
  offlineCompletedCount: number;
  evaluatedCount: number;
  resubmitRequestedCount: number;
  pendingCount: number;
  completionPercent: number;
}

export function computeAssignmentCompletionMetrics(
  totalEnrolled: number,
  submissions: readonly { status: SubmissionStatus }[],
): AssignmentCompletionMetrics {
  let submittedCount = 0;
  let lateCount = 0;
  let offlineCompletedCount = 0;
  let evaluatedCount = 0;
  let resubmitRequestedCount = 0;
  let completedOrEvaluated = 0;

  for (const submission of submissions) {
    switch (submission.status) {
      case "submitted":
        submittedCount += 1;
        completedOrEvaluated += 1;
        break;
      case "late_submitted":
        lateCount += 1;
        completedOrEvaluated += 1;
        break;
      case "completed_offline":
        offlineCompletedCount += 1;
        completedOrEvaluated += 1;
        break;
      case "evaluated":
        evaluatedCount += 1;
        completedOrEvaluated += 1;
        break;
      case "resubmit_requested":
        resubmitRequestedCount += 1;
        break;
      case "assigned":
        break;
    }
  }

  const normalizedEnrolled = Math.max(0, totalEnrolled);
  const completedBounded = Math.min(normalizedEnrolled, completedOrEvaluated);
  const pendingCount = Math.max(0, normalizedEnrolled - completedBounded);
  const completionPercent =
    normalizedEnrolled === 0
      ? 0
      : Math.round((completedBounded / normalizedEnrolled) * 100);

  return {
    totalEnrolled: normalizedEnrolled,
    submittedCount,
    lateCount,
    offlineCompletedCount,
    evaluatedCount,
    resubmitRequestedCount,
    pendingCount,
    completionPercent,
  };
}
