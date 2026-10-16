import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  announcements as initialAnnouncements,
  attendanceRecords as mockAttendanceRecords,
  classSchedule,
  CURRENT_STUDENT_GRADE,
  CURRENT_STUDENT_ID,
  initialAssignments,
  subjects as mockSubjects,
  teacherProfile as mockTeacherProfile,
  tests,
} from "../data/mockData";
import type {
  Announcement,
  AnnouncementAudience,
  Assignment,
  AssignmentStatus,
  Attachment,
  AttendanceRecord,
  AttendanceStatus,
  ClassPeriod,
  ClassSection,
  ExamKind,
  FeeKind,
  FeePaymentStatus,
  FeePlanAssignmentRow,
  FeePlanItem,
  FeePlanSummary,
  GradeFeeRate,
  Quiz,
  QuizAttempt,
  QuizQuestion,
  SectionPeriod,
  SectionStudentRosterEntry,
  StudentFeeItemView,
  StudentFeeOverview,
  StudentFeePlanView,
  ClassRosterMode,
  SchoolClass,
  StudentFeeRosterEntry,
  SubjectCatalogEntry,
  SubjectFeeEnrollment,
  SubjectFeeRate,
  Submission,
  TeacherAssignmentSummary,
  TeacherExamSummary,
  TeacherQuizSummary,
  Subject,
  TeacherReview,
  TestEvent,
} from "../types";
import { toIsoDate, nowLocalIso } from "../dateUtils";
import { applyRetentionPolicy } from "../dataRetention";
import { useAuth } from "./AuthContext";
import { isSupabaseConfigured } from "../lib/supabaseClient";
import { listUsers, setTeacherSubject, subscribeToUsers, type SchoolUserRecord } from "../services/usersService";
import {
  createAssignment,
  fetchAssignments,
  fetchSubmissions,
  purgeAssignmentAttachments,
  subscribeToAssignments,
  subscribeToSubmissions,
  upsertSubmissionRow,
  type RawAssignment,
  type RawAttachment,
  type RawSubmission,
} from "../services/assignmentsService";
import {
  fetchAttendance,
  markAttendance as markAttendanceRow,
  subscribeToAttendance,
  type RawAttendanceRecord,
} from "../services/attendanceService";
import {
  createAnnouncement,
  fetchAnnouncements,
  subscribeToAnnouncements,
  type RawAnnouncement,
} from "../services/announcementsService";
import {
  createExam,
  deleteExamWeightOverride,
  fetchExamGrades,
  fetchExams,
  fetchExamWeightOverrides,
  subscribeToExamGrades,
  subscribeToExams,
  subscribeToExamWeightOverrides,
  updateExamWeight,
  upsertExamGrade,
  upsertExamWeightOverride,
  type RawExam,
  type RawExamGrade,
  type RawExamWeightOverride,
} from "../services/examsService";
import {
  createQuiz,
  deleteQuizWeightOverride,
  fetchQuizAttempts,
  fetchQuizzes,
  fetchQuizWeightOverrides,
  submitQuizAttempt,
  subscribeToQuizAttempts,
  subscribeToQuizzes,
  subscribeToQuizWeightOverrides,
  updateQuizWeight,
  upsertQuizWeightOverride,
  type RawQuiz,
  type RawQuizAttempt,
  type RawQuizWeightOverride,
} from "../services/quizzesService";
import {
  fetchGradingDefaults,
  subscribeToGradingDefaults,
  upsertGradingDefaults,
  type RawGradingDefaults,
} from "../services/gradingDefaultsService";
import {
  createSection,
  createSectionPeriod,
  deleteSection,
  deleteSectionPeriod,
  fetchSectionPeriods,
  fetchSections,
  setStudentSection,
  subscribeToSections,
  type RawClassSection,
  type RawSectionPeriod,
} from "../services/sectionsService";
import { fetchSchoolFeatures, subscribeToSchoolFeatures } from "../services/featuresService";
import {
  addSubjectCatalogEntry,
  fetchSubjectCatalog,
  removeSubjectCatalogEntry,
  subscribeToSubjectCatalog,
  type RawSubjectCatalogEntry,
} from "../services/subjectCatalogService";
import {
  createClass,
  deleteClass,
  enrollStudent,
  fetchClassEnrollments,
  fetchClasses,
  subscribeToClasses,
  unenrollStudent,
  type RawClass,
  type RawClassEnrollment,
  type RosterMode,
} from "../services/classesService";
import {
  assignFeePlan,
  createFeePlan,
  deleteFeePlan,
  deleteSubjectFeeRate,
  fetchFeeAssignments,
  fetchFeeItemPayments,
  fetchFeePlanItems,
  fetchFeePlans,
  fetchFeeSettings,
  fetchGradeFeePayments,
  fetchGradeFeeRates,
  fetchSubjectFeeEnrollments,
  fetchSubjectFeePayments,
  fetchSubjectFeeRates,
  subscribeToFees,
  unassignFeePlan,
  upsertFeeItemPayment,
  upsertFeeSettings,
  upsertGradeFeePayment,
  upsertGradeFeeRate,
  upsertSubjectFeeEnrollment,
  upsertSubjectFeePayment,
  upsertSubjectFeeRate,
  type RawFeeAssignment,
  type RawFeeItemPayment,
  type RawFeePlan,
  type RawFeePlanItem,
  type RawFeeSettings,
  type RawGradeFeePayment,
  type RawGradeFeeRate,
  type RawSubjectFeeEnrollment,
  type RawSubjectFeePayment,
  type RawSubjectFeeRate,
} from "../services/feesService";

export type NewAssignmentInput = {
  subjectId: string;
  /** Which of the teacher's classes this is for — required for real (Supabase) teachers with more than one class. */
  classId?: string;
  title: string;
  chapter?: string;
  exercises?: string;
  dueDate: string;
  submissionEnabled: boolean;
  attachments?: Attachment[];
  /** Specific real students to send this assignment to — omit/empty for every student enrolled in the class. */
  assignedStudentIds?: string[];
};

export type NewAnnouncementInput = Omit<Announcement, "id" | "date">;

export type NewQuizInput = {
  title: string;
  /** Which of the teacher's classes this is for — required for real teachers with more than one class. */
  classId?: string;
  section?: string;
  dueDate?: string;
  questions: QuizQuestion[];
  /** Specific real students to send this quiz to — omit/empty for every student enrolled in the class. */
  assignedStudentIds?: string[];
  /** How much this counts toward the overall grade — teacher's choice. */
  weightPercent?: number;
};

export type NewExamInput = {
  title: string;
  /** Which of the teacher's classes this is for — required for real teachers with more than one class. */
  classId?: string;
  date: string;
  kind: ExamKind;
  detail?: string;
  /** Specific real students this exam applies to — omit/empty for every student enrolled in the class. */
  assignedStudentIds?: string[];
  /** How much this counts toward the overall grade — teacher's choice. */
  weightPercent?: number;
};

export type NewSectionPeriodInput = {
  sectionId: string;
  day: number;
  startTime: string;
  endTime: string;
  /** Which class this period belongs to — determines the subject/teacher shown and whose roster sees it. */
  classId: string;
  room?: string;
};

export type NewFeePlanInput = {
  title: string;
  kind: FeeKind;
  items: { label: string; amount: number; dueDate?: string }[];
  /** Students to assign this plan to right away — omit/empty for none (assign later). */
  assignedStudentIds?: string[];
};

export interface StudentRiskSnapshot {
  studentId: string;
  studentName: string;
  attendanceRecords: AttendanceRecord[];
  assignments: Assignment[];
  quizScores: { score: number; outOf: number; submittedAt: string }[];
}

function isVisibleToCurrentStudent(audience: AnnouncementAudience, subjectIds: string[]): boolean {
  switch (audience.type) {
    case "school":
      return true;
    case "grade":
      return audience.grade === CURRENT_STUDENT_GRADE;
    case "class":
      return audience.subjectId ? subjectIds.includes(audience.subjectId) : false;
    case "students":
      return audience.studentIds?.includes(CURRENT_STUDENT_ID) ?? false;
    case "parents":
    case "teachers":
      return false;
  }
}

/** A parent sees everything their child would, plus parent-only notices — never teacher-only ones. */
function isVisibleToCurrentParent(audience: AnnouncementAudience, subjectIds: string[]): boolean {
  if (audience.type === "parents") return true;
  if (audience.type === "teachers") return false;
  return isVisibleToCurrentStudent(audience, subjectIds);
}

const STORAGE_KEY = "schola.assignments.v1";
const ANNOUNCEMENTS_STORAGE_KEY = "schola.announcements.v1";
const MOCK_QUIZZES_KEY = "schola.teacherQuizzes.v1";
const MOCK_QUIZ_ATTEMPTS_KEY = "schola.quizAttempts.v1";
const MOCK_EXAMS_KEY = "schola.teacherExams.v1";
const MOCK_EXAM_GRADES_KEY = "schola.examGrades.v1";

interface MockQuizRecord {
  id: string;
  title: string;
  section: string;
  dueDate: string;
  questions: QuizQuestion[];
  createdAt: string;
  weightPercent?: number;
}

function loadMockQuizzes(): MockQuizRecord[] {
  try {
    const raw = localStorage.getItem(MOCK_QUIZZES_KEY);
    return raw ? (JSON.parse(raw) as MockQuizRecord[]) : [];
  } catch {
    return [];
  }
}

interface MockExamRecord {
  id: string;
  title: string;
  date: string;
  kind: ExamKind;
  detail?: string;
  createdAt: string;
  weightPercent?: number;
}

function loadMockExams(): MockExamRecord[] {
  try {
    const raw = localStorage.getItem(MOCK_EXAMS_KEY);
    return raw ? (JSON.parse(raw) as MockExamRecord[]) : [];
  } catch {
    return [];
  }
}

/** Keyed by `${examId}::${studentId}`. */
function loadMockExamGrades(): Record<string, { score: number; outOf: number }> {
  try {
    const raw = localStorage.getItem(MOCK_EXAM_GRADES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function loadMockQuizAttempts(): Record<string, QuizAttempt> {
  try {
    const raw = localStorage.getItem(MOCK_QUIZ_ATTEMPTS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function loadAssignments(): Assignment[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const merged = (() => {
      if (!raw) return initialAssignments;
      const saved = JSON.parse(raw) as Assignment[];
      const savedIds = new Set(saved.map((a) => a.id));
      const combined = [...saved];
      for (const a of initialAssignments) {
        if (!savedIds.has(a.id)) combined.push(a);
      }
      return combined;
    })();
    // Auto-purge old file attachments/submissions on every load — keeps localStorage lean.
    return applyRetentionPolicy(merged).assignments;
  } catch {
    return initialAssignments;
  }
}

function loadAnnouncements(): Announcement[] {
  try {
    const raw = localStorage.getItem(ANNOUNCEMENTS_STORAGE_KEY);
    if (!raw) return initialAnnouncements;
    const saved = JSON.parse(raw) as Announcement[];
    const savedIds = new Set(saved.map((a) => a.id));
    const merged = [...saved];
    for (const a of initialAnnouncements) {
      if (!savedIds.has(a.id)) merged.push(a);
    }
    return merged;
  } catch {
    return initialAnnouncements;
  }
}

export const STATUS_ORDER: AssignmentStatus[] = ["not_started", "in_progress", "completed"];

interface AppDataContextValue {
  subjects: Subject[];
  classSchedule: ClassPeriod[];
  tests: TestEvent[];
  announcements: Announcement[];
  announcementsForParent: Announcement[];
  assignments: Assignment[];
  attendanceRecords: AttendanceRecord[];
  riskSnapshots: StudentRiskSnapshot[];
  realStudents: { id: string; name: string }[];
  teacherAssignmentResults: TeacherAssignmentSummary[];
  quizzes: Quiz[];
  teacherQuizResults: TeacherQuizSummary[];
  teacherExamResults: TeacherExamSummary[];
  getSubject: (id: string) => Subject | undefined;
  setAssignmentStatus: (id: string, status: AssignmentStatus) => void;
  cycleAssignmentStatus: (id: string) => void;
  submitAssignmentWork: (id: string, submission: Submission) => void;
  clearAssignmentSubmission: (id: string) => void;
  addAssignment: (input: NewAssignmentInput) => void;
  addAnnouncement: (input: NewAnnouncementInput) => void;
  markAttendance: (studentId: string, date: string, status: AttendanceStatus, classId?: string) => void;
  addQuiz: (input: NewQuizInput) => void;
  submitQuizAnswers: (quizId: string, answers: number[]) => Promise<QuizSubmitResult>;
  addExam: (input: NewExamInput) => void;
  setExamGrade: (examId: string, studentId: string, score: number, outOf: number) => void;
  updateQuizWeight: (quizId: string, weightPercent: number | null) => void;
  updateExamWeight: (examId: string, weightPercent: number | null) => void;
  setQuizWeightOverride: (quizId: string, studentId: string, weightPercent: number | null) => void;
  setExamWeightOverride: (examId: string, studentId: string, weightPercent: number | null) => void;
  /** Per-teacher default weight (%) to prefill new quizzes/exams with — still freely overridable per item. */
  gradingDefaults: { quizWeight?: number; examWeight?: number };
  setGradingDefaults: (input: { quizWeight?: number | null; examWeight?: number | null }) => void;
  /** Whether the owner has turned the Sections feature on for this school — gates the Sections UI. */
  sectionsFeatureEnabled: boolean;
  /** Whether the owner has turned the Gradebook feature on for this school — gates weighting/grading UI. */
  gradebookFeatureEnabled: boolean;
  /** Whether the owner has turned on per-student weight overrides (a Gradebook sub-feature). */
  gradebookStudentOverridesEnabled: boolean;
  sections: ClassSection[];
  sectionPeriods: SectionPeriod[];
  addSection: (name: string, grade?: number) => Promise<ClassSection>;
  removeSection: (id: string) => void;
  /** Admin-managed subject names, independent of any teacher account — lets the admin pre-create subjects and pick from them when creating a teacher. */
  subjectCatalog: SubjectCatalogEntry[];
  addSubjectCatalogEntry: (name: string) => Promise<SubjectCatalogEntry>;
  removeSubjectCatalogEntry: (id: string) => void;
  /** Admin-only (enforced server-side) — (re)assigns a teacher's subject, or null to clear it. */
  assignTeacherSubject: (teacherId: string, subjectName: string | null) => Promise<void>;
  /** Every class (teacher × subject × roster) in the school, readable by anyone in it. */
  classes: SchoolClass[];
  /** The classes the current teacher teaches — drives the class picker when creating content. */
  myTeacherClasses: SchoolClass[];
  /** The classes the current viewer (or their linked child) is enrolled in. */
  myEnrolledClasses: SchoolClass[];
  classRoster: (classId: string) => { id: string; name: string }[];
  createClass: (input: {
    teacherId: string;
    subjectId: string;
    rosterMode: ClassRosterMode;
    sectionId?: string | null;
  }) => Promise<SchoolClass>;
  deleteClass: (id: string) => void;
  enrollStudentInClass: (classId: string, studentId: string) => void;
  unenrollStudentFromClass: (classId: string, studentId: string) => void;
  addSectionPeriod: (input: NewSectionPeriodInput) => void;
  removeSectionPeriod: (id: string) => void;
  /** Admin-only — every real student with their current section, for the "add students to this section" picker. */
  sectionStudentRoster: SectionStudentRosterEntry[];
  /** Admin-only (enforced server-side) — reassigns a student to a section, or null to remove them from one. */
  assignStudentToSection: (studentId: string, sectionId: string | null) => Promise<void>;
  /** Whether the owner has turned the Fees feature on for this school. */
  feesFeatureEnabled: boolean;
  feesItemizedEnabled: boolean;
  feesGradeBasedEnabled: boolean;
  feesSubjectBasedEnabled: boolean;
  /** Admin-only — every fee plan this school has, with assignment/payment totals per student. */
  feePlans: FeePlanSummary[];
  /** The current viewer's own assigned fee plans (resolves to the linked child for a parent) — includes synthesized grade/subject fee "plans" alongside manually-assigned ones. */
  myFeePlans: StudentFeePlanView[];
  createFeePlan: (input: NewFeePlanInput) => Promise<void>;
  assignFeePlan: (planId: string, studentIds: string[]) => void;
  unassignFeePlan: (planId: string, studentId: string) => void;
  deleteFeePlan: (planId: string) => void;
  setFeeItemPayment: (itemId: string, studentId: string, status: FeePaymentStatus, paidAmount: number) => void;
  /** Admin-only — the current per-grade fee amounts. */
  gradeFeeRates: GradeFeeRate[];
  /** Admin-only — the current per-subject fee amounts (plus the general fallback, isGeneral: true). */
  subjectFeeRates: SubjectFeeRate[];
  /** Admin-only — every real student with their grade and schedule-derived subjects, for the Grade/Subject fee rosters. */
  studentFeeRoster: StudentFeeRosterEntry[];
  /** Admin-only — every real student with every fee plan that applies to them, for the Fees page search. */
  studentFeeOverviews: StudentFeeOverview[];
  setGradeFeeRate: (grade: number, amount: number | null) => void;
  setSubjectFeeRate: (input: { id?: string; subjectLabel?: string; isGeneral?: boolean; amount: number }) => void;
  removeSubjectFeeRate: (id: string) => void;
  setGradeFeePayment: (studentId: string, status: FeePaymentStatus, paidAmount: number) => void;
  setSubjectFeePayment: (studentId: string, subjectLabel: string, status: FeePaymentStatus, paidAmount: number) => void;
  /** How many days after starting a priced subject a student can drop it with the fee waived. */
  subjectDropGraceDays: number;
  setSubjectDropGraceDays: (days: number) => void;
  subjectFeeEnrollmentFor: (studentId: string, subjectLabel: string) => SubjectFeeEnrollment | undefined;
  /** Lazily records "this student started taking this subject today" the first time we notice — idempotent. */
  ensureSubjectFeeEnrollment: (studentId: string, subjectLabel: string) => void;
  /** Records a drop on the given date — waives the fee if within the grace period, otherwise it still shows as owed. */
  dropSubjectFee: (studentId: string, subjectLabel: string, droppedAtIso: string, startedAtIso?: string) => Promise<void>;
  /** Undoes a drop — the student is back on the hook for this subject as a fresh enrollment. */
  reactivateSubjectFee: (studentId: string, subjectLabel: string) => Promise<void>;
}

export interface QuizSubmitResult {
  score: number;
  outOf: number;
}

const AppDataContext = createContext<AppDataContextValue | null>(null);

/** Matches a real teacher's free-text subject name to one of the seeded mock subjects for a color/icon. */
function deriveRealSubjects(teachers: SchoolUserRecord[]): Subject[] {
  return teachers.map((t) => {
    const matched = mockSubjects.find(
      (s) => s.name.toLowerCase() === (t.subject_name ?? "").toLowerCase(),
    );
    return {
      id: t.id,
      name: t.subject_name || "General",
      icon: matched?.icon ?? "BookOpen",
      color: matched?.color ?? "#2563EB",
      teacher: t.name,
      room: "—",
    };
  });
}

function toAttachment(a: RawAttachment): Attachment {
  return {
    id: a.id,
    type: a.type as Attachment["type"],
    name: a.name,
    detail: a.detail,
    dataUrl: a.dataUrl,
    fileRemovedAt: a.fileRemovedAt,
  };
}

function toSubmission(s: RawSubmission | undefined): Submission | undefined {
  if (!s || !s.kind) return undefined;
  return {
    kind: s.kind,
    fileName: s.file_name ?? undefined,
    fileType: s.file_type ?? undefined,
    dataUrl: s.data_url ?? undefined,
    textContent: s.text_content ?? undefined,
    submittedAt: s.submitted_at ?? "",
    fileRemovedAt: s.file_removed_at ?? undefined,
  };
}

function toReview(s: RawSubmission | undefined): TeacherReview | undefined {
  if (!s || !s.review_status) return undefined;
  return {
    status: s.review_status,
    score: s.review_score ?? undefined,
    outOf: s.review_out_of ?? undefined,
    feedback: s.review_feedback ?? "",
    reviewedAt: s.reviewed_at ?? "",
  };
}

function toAssignment(raw: RawAssignment, submission: RawSubmission | undefined): Assignment {
  return {
    id: raw.id,
    subjectId: raw.teacher_id ?? "general",
    classId: raw.class_id ?? undefined,
    title: raw.title,
    chapter: raw.chapter ?? undefined,
    exercises: raw.exercises ?? undefined,
    dueDate: raw.due_date,
    status: submission?.status ?? "not_started",
    attachments: raw.attachments.map(toAttachment),
    submissionEnabled: raw.submission_enabled,
    submission: toSubmission(submission),
    review: toReview(submission),
    createdAt: raw.created_at,
  };
}

function toAttendanceRecord(raw: RawAttendanceRecord, studentName?: string): AttendanceRecord {
  return {
    id: raw.id,
    subjectId: raw.teacher_id ?? "general",
    classId: raw.class_id ?? undefined,
    date: raw.date,
    status: raw.status,
    studentId: raw.student_id,
    studentName,
  };
}

function toAnnouncement(raw: RawAnnouncement): Announcement {
  return {
    id: raw.id,
    title: raw.title,
    body: raw.body,
    date: raw.created_at.slice(0, 10),
    important: raw.important,
    category: raw.category,
    audience: {
      type: raw.audience_type,
      label: raw.audience_label,
      grade: raw.audience_grade ?? undefined,
      subjectId: raw.audience_subject ?? undefined,
      studentIds: raw.audience_student_ids ?? undefined,
    },
  };
}

function toQuizQuestion(q: RawQuiz["questions"][number]): QuizQuestion {
  return { id: q.id, text: q.text, options: q.options, correctIndex: q.correctIndex };
}

function toTestEvent(raw: RawExam, myGrade?: RawExamGrade): TestEvent {
  return {
    id: raw.id,
    subjectId: raw.teacher_id,
    title: raw.title,
    date: raw.date,
    kind: raw.kind,
    detail: raw.detail ?? undefined,
    createdAt: raw.created_at,
    weightPercent: raw.weight_percent ?? undefined,
    myGrade: myGrade ? { score: myGrade.score, outOf: myGrade.out_of } : undefined,
  };
}

function toQuiz(raw: RawQuiz, teacherName: string, attempt: RawQuizAttempt | undefined): Quiz {
  return {
    id: raw.id,
    teacherName,
    subjectLabel: raw.section ?? "Class",
    title: raw.title,
    dueDate: raw.due_date ?? undefined,
    questions: raw.questions.map(toQuizQuestion),
    myAttempt: attempt
      ? { answers: attempt.answers, score: attempt.score, outOf: attempt.out_of, submittedAt: attempt.submitted_at }
      : undefined,
    createdAt: raw.created_at,
    weightPercent: raw.weight_percent ?? undefined,
  };
}

function scoreQuiz(questions: QuizQuestion[], answers: number[]): QuizSubmitResult {
  const score = questions.reduce((sum, q, i) => (answers[i] === q.correctIndex ? sum + 1 : sum), 0);
  return { score, outOf: questions.length };
}

/** Real, Supabase-backed app data for actual logged-in accounts. */
function RealAppDataProvider({ profile, children }: { profile: SchoolUserRecord; children: ReactNode }) {
  const [allUsers, setAllUsers] = useState<SchoolUserRecord[]>([profile]);
  const [rawAssignments, setRawAssignments] = useState<RawAssignment[]>([]);
  const [rawSubmissions, setRawSubmissions] = useState<RawSubmission[]>([]);
  const [rawAttendance, setRawAttendance] = useState<RawAttendanceRecord[]>([]);
  const [rawAnnouncements, setRawAnnouncements] = useState<RawAnnouncement[]>([]);
  const [rawQuizzes, setRawQuizzes] = useState<RawQuiz[]>([]);
  const [rawQuizAttempts, setRawQuizAttempts] = useState<RawQuizAttempt[]>([]);
  const [rawExams, setRawExams] = useState<RawExam[]>([]);
  const [rawExamGrades, setRawExamGrades] = useState<RawExamGrade[]>([]);
  const [rawQuizWeightOverrides, setRawQuizWeightOverrides] = useState<RawQuizWeightOverride[]>([]);
  const [rawExamWeightOverrides, setRawExamWeightOverrides] = useState<RawExamWeightOverride[]>([]);
  const [rawGradingDefaults, setRawGradingDefaults] = useState<RawGradingDefaults | null>(null);
  const [rawSections, setRawSections] = useState<RawClassSection[]>([]);
  const [rawSectionPeriods, setRawSectionPeriods] = useState<RawSectionPeriod[]>([]);
  const [rawSubjectCatalog, setRawSubjectCatalog] = useState<RawSubjectCatalogEntry[]>([]);
  const [rawClasses, setRawClasses] = useState<RawClass[]>([]);
  const [rawClassEnrollments, setRawClassEnrollments] = useState<RawClassEnrollment[]>([]);
  const [rawFeePlans, setRawFeePlans] = useState<RawFeePlan[]>([]);
  const [rawFeePlanItems, setRawFeePlanItems] = useState<RawFeePlanItem[]>([]);
  const [rawFeeAssignments, setRawFeeAssignments] = useState<RawFeeAssignment[]>([]);
  const [rawFeeItemPayments, setRawFeeItemPayments] = useState<RawFeeItemPayment[]>([]);
  const [rawGradeFeeRates, setRawGradeFeeRates] = useState<RawGradeFeeRate[]>([]);
  const [rawSubjectFeeRates, setRawSubjectFeeRates] = useState<RawSubjectFeeRate[]>([]);
  const [rawGradeFeePayments, setRawGradeFeePayments] = useState<RawGradeFeePayment[]>([]);
  const [rawSubjectFeePayments, setRawSubjectFeePayments] = useState<RawSubjectFeePayment[]>([]);
  const [rawFeeSettings, setRawFeeSettings] = useState<RawFeeSettings | null>(null);
  const [rawSubjectFeeEnrollments, setRawSubjectFeeEnrollments] = useState<RawSubjectFeeEnrollment[]>([]);
  const [features, setFeatures] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      Promise.all([fetchSections(), fetchSectionPeriods()]).then(([s, p]) => {
        if (cancelled) return;
        setRawSections(s);
        setRawSectionPeriods(p);
      });
    };
    load();
    const unsub = subscribeToSections(load);
    return () => {
      cancelled = true;
      unsub();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      fetchSubjectCatalog().then((rows) => {
        if (!cancelled) setRawSubjectCatalog(rows);
      });
    };
    load();
    const unsub = subscribeToSubjectCatalog(load);
    return () => {
      cancelled = true;
      unsub();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      Promise.all([fetchClasses(), fetchClassEnrollments()]).then(([c, e]) => {
        if (cancelled) return;
        setRawClasses(c);
        setRawClassEnrollments(e);
      });
    };
    load();
    const unsub = subscribeToClasses(load);
    return () => {
      cancelled = true;
      unsub();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      Promise.all([
        fetchFeePlans(),
        fetchFeePlanItems(),
        fetchFeeAssignments(),
        fetchFeeItemPayments(),
        fetchGradeFeeRates(),
        fetchSubjectFeeRates(),
        fetchGradeFeePayments(),
        fetchSubjectFeePayments(),
        fetchFeeSettings(),
        fetchSubjectFeeEnrollments(),
      ]).then(
        ([
          plans,
          items,
          assignments,
          payments,
          gradeRates,
          subjectRates,
          gradePayments,
          subjectPayments,
          settings,
          enrollments,
        ]) => {
          if (cancelled) return;
          setRawFeePlans(plans);
          setRawFeePlanItems(items);
          setRawFeeAssignments(assignments);
          setRawFeeItemPayments(payments);
          setRawGradeFeeRates(gradeRates);
          setRawSubjectFeeRates(subjectRates);
          setRawGradeFeePayments(gradePayments);
          setRawSubjectFeePayments(subjectPayments);
          setRawFeeSettings(settings[0] ?? null);
          setRawSubjectFeeEnrollments(enrollments);
        },
      );
    };
    load();
    const unsub = subscribeToFees(load);
    return () => {
      cancelled = true;
      unsub();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      fetchExamGrades().then((g) => {
        if (!cancelled) setRawExamGrades(g);
      });
    };
    load();
    const unsub = subscribeToExamGrades(load);
    return () => {
      cancelled = true;
      unsub();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      Promise.all([fetchQuizWeightOverrides(), fetchExamWeightOverrides()]).then(([qo, eo]) => {
        if (cancelled) return;
        setRawQuizWeightOverrides(qo);
        setRawExamWeightOverrides(eo);
      });
    };
    load();
    const unsubQuiz = subscribeToQuizWeightOverrides(load);
    const unsubExam = subscribeToExamWeightOverrides(load);
    return () => {
      cancelled = true;
      unsubQuiz();
      unsubExam();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      fetchGradingDefaults(profile.id).then((d) => {
        if (!cancelled) setRawGradingDefaults(d);
      });
    };
    load();
    const unsub = subscribeToGradingDefaults(load);
    return () => {
      cancelled = true;
      unsub();
    };
  }, [profile.id]);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      fetchSchoolFeatures(profile.school_id).then((f) => {
        if (!cancelled) setFeatures(f);
      });
    };
    load();
    const unsub = subscribeToSchoolFeatures(profile.school_id, load);
    return () => {
      cancelled = true;
      unsub();
    };
  }, [profile.school_id]);

  useEffect(() => {
    let cancelled = false;
    listUsers()
      .then((users) => {
        if (!cancelled) setAllUsers(users);
      })
      .catch(() => {
        if (!cancelled) setAllUsers([profile]);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return subscribeToUsers(
      (user) => setAllUsers((prev) => (prev.some((u) => u.id === user.id) ? prev : [...prev, user])),
      (id) => setAllUsers((prev) => prev.filter((u) => u.id !== id)),
      (user) => setAllUsers((prev) => prev.map((u) => (u.id === user.id ? user : u))),
    );
  }, []);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetchAssignments(),
      fetchSubmissions(),
      fetchAttendance(),
      fetchAnnouncements(),
      fetchQuizzes(),
      fetchQuizAttempts(),
      fetchExams(),
    ])
      .then(([a, s, att, an, q, qa, ex]) => {
        if (cancelled) return;
        setRawAssignments(a);
        setRawSubmissions(s);
        setRawAttendance(att);
        setRawAnnouncements(an);
        setRawQuizzes(q);
        setRawQuizAttempts(qa);
        setRawExams(ex);
      })
      .catch(() => {
        // leave whatever's already loaded in place
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const unsubAssignments = subscribeToAssignments((row) =>
      setRawAssignments((prev) => (prev.some((x) => x.id === row.id) ? prev : [...prev, row])),
    );
    const unsubSubmissions = subscribeToSubmissions((row) =>
      setRawSubmissions((prev) => {
        const idx = prev.findIndex((x) => x.id === row.id);
        if (idx === -1) return [...prev, row];
        const next = [...prev];
        next[idx] = row;
        return next;
      }),
    );
    const unsubAttendance = subscribeToAttendance((row) =>
      setRawAttendance((prev) => {
        const idx = prev.findIndex((x) => x.id === row.id);
        if (idx === -1) return [...prev, row];
        const next = [...prev];
        next[idx] = row;
        return next;
      }),
    );
    const unsubAnnouncements = subscribeToAnnouncements((row) =>
      setRawAnnouncements((prev) => (prev.some((x) => x.id === row.id) ? prev : [...prev, row])),
    );
    const unsubQuizzes = subscribeToQuizzes((row) =>
      setRawQuizzes((prev) => (prev.some((x) => x.id === row.id) ? prev : [...prev, row])),
    );
    const unsubQuizAttempts = subscribeToQuizAttempts((row) =>
      setRawQuizAttempts((prev) => (prev.some((x) => x.id === row.id) ? prev : [...prev, row])),
    );
    const unsubExams = subscribeToExams((row) =>
      setRawExams((prev) => (prev.some((x) => x.id === row.id) ? prev : [...prev, row])),
    );
    return () => {
      unsubAssignments();
      unsubSubmissions();
      unsubAttendance();
      unsubAnnouncements();
      unsubQuizzes();
      unsubQuizAttempts();
      unsubExams();
    };
  }, []);

  const usersById = useMemo(() => new Map(allUsers.map((u) => [u.id, u])), [allUsers]);
  const teachers = useMemo(() => allUsers.filter((u) => u.role === "teacher"), [allUsers]);
  const students = useMemo(() => allUsers.filter((u) => u.role === "student"), [allUsers]);

  const subjectList = useMemo(() => deriveRealSubjects(teachers), [teachers]);
  const subjectMap = useMemo(() => new Map(subjectList.map((s) => [s.id, s])), [subjectList]);

  const submissionByKey = useMemo(() => {
    const m = new Map<string, RawSubmission>();
    for (const s of rawSubmissions) m.set(`${s.assignment_id}::${s.student_id}`, s);
    return m;
  }, [rawSubmissions]);

  // Who this viewer's "assignments"/"attendanceRecords" represent: themselves if a student,
  // their linked child if a parent, or nobody in particular (teacher/admin use riskSnapshots instead).
  const perspectiveStudentId =
    profile.role === "student" ? profile.id : profile.role === "parent" ? profile.linked_student_id : undefined;

  const sectionsFeatureEnabled = features.sections === true;
  const gradebookFeatureEnabled = features.gradebook === true;
  const gradebookStudentOverridesEnabled = gradebookFeatureEnabled && features.gradebook_student_overrides === true;
  const feesFeatureEnabled = features.fees === true;
  const feesItemizedEnabled = feesFeatureEnabled && features.fees_itemized === true;
  const feesGradeBasedEnabled = feesFeatureEnabled && features.fees_grade_based === true;
  const feesSubjectBasedEnabled = feesFeatureEnabled && features.fees_subject_based === true;

  const sections = useMemo(
    (): ClassSection[] => rawSections.map((s) => ({ id: s.id, name: s.name, grade: s.grade })),
    [rawSections],
  );

  const subjectCatalog = useMemo(
    (): SubjectCatalogEntry[] => rawSubjectCatalog.map((s) => ({ id: s.id, name: s.name })),
    [rawSubjectCatalog],
  );

  const addSubjectCatalogEntryFn = async (name: string): Promise<SubjectCatalogEntry> => {
    const row = await addSubjectCatalogEntry(name);
    return { id: row.id, name: row.name };
  };

  const removeSubjectCatalogEntryFn = (id: string) => {
    removeSubjectCatalogEntry(id).catch(() => {});
  };

  const assignTeacherSubject = async (teacherId: string, subjectName: string | null): Promise<void> => {
    await setTeacherSubject(teacherId, subjectName);
  };

  const classRosterStudentIds = (cls: RawClass): string[] =>
    cls.roster_mode === "section"
      ? cls.section_id
        ? students.filter((s) => s.section_id === cls.section_id).map((s) => s.id)
        : []
      : rawClassEnrollments.filter((e) => e.class_id === cls.id).map((e) => e.student_id);

  const allClassesResolved = useMemo((): SchoolClass[] => {
    const sectionNameById = new Map(rawSections.map((s) => [s.id, s.name]));
    const subjectNameById = new Map(rawSubjectCatalog.map((s) => [s.id, s.name]));
    return rawClasses.map((c) => ({
      id: c.id,
      teacherId: c.teacher_id,
      teacherName: usersById.get(c.teacher_id)?.name ?? "Teacher",
      subjectId: c.subject_id,
      subjectName: subjectNameById.get(c.subject_id) ?? "Subject",
      rosterMode: c.roster_mode,
      sectionId: c.section_id,
      sectionName: c.section_id ? sectionNameById.get(c.section_id) ?? null : null,
      studentCount: classRosterStudentIds(c).length,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawClasses, rawSections, rawSubjectCatalog, usersById, students, rawClassEnrollments]);

  /**
   * Every class in the school — readable by anyone (matches the `classes` table's RLS, which is
   * whole-school read / admin-only write), used both for the admin's Subjects/Teachers management
   * UI and for any viewer to resolve a class's subject/teacher name (e.g. Agenda, Classes.tsx).
   * Note: `studentCount` is only accurate for admins — a non-admin's `class_enrollments` reads are
   * RLS-limited to their own rows, but nothing non-admin-facing displays that count.
   */
  const classes = allClassesResolved;

  /** The classes this teacher teaches — drives the class picker when creating assignments/etc. */
  const myTeacherClasses = useMemo(
    (): SchoolClass[] =>
      profile.role === "teacher" ? allClassesResolved.filter((c) => c.teacherId === profile.id) : [],
    [profile.role, profile.id, allClassesResolved],
  );

  /** The classes the viewer (or their linked child, for a parent) is enrolled in — "My Subjects"/Classes.tsx. */
  const myEnrolledClasses = useMemo((): SchoolClass[] => {
    if (!perspectiveStudentId) return [];
    const them = usersById.get(perspectiveStudentId);
    return allClassesResolved.filter((c) =>
      c.rosterMode === "section"
        ? them?.section_id != null && c.sectionId === them.section_id
        : rawClassEnrollments.some((e) => e.class_id === c.id && e.student_id === perspectiveStudentId),
    );
  }, [perspectiveStudentId, usersById, allClassesResolved, rawClassEnrollments]);

  const classRoster = (classId: string): { id: string; name: string }[] => {
    const cls = rawClasses.find((c) => c.id === classId);
    if (!cls) return [];
    return classRosterStudentIds(cls).map((id) => ({ id, name: usersById.get(id)?.name ?? "Student" }));
  };

  const createClassFn = async (input: {
    teacherId: string;
    subjectId: string;
    rosterMode: RosterMode;
    sectionId?: string | null;
  }): Promise<SchoolClass> => {
    const row = await createClass(input);
    setRawClasses((prev) => [...prev, row]);
    return {
      id: row.id,
      teacherId: row.teacher_id,
      teacherName: usersById.get(row.teacher_id)?.name ?? "Teacher",
      subjectId: row.subject_id,
      subjectName: rawSubjectCatalog.find((s) => s.id === row.subject_id)?.name ?? "Subject",
      rosterMode: row.roster_mode,
      sectionId: row.section_id,
      sectionName: row.section_id ? rawSections.find((s) => s.id === row.section_id)?.name ?? null : null,
      studentCount: 0,
    };
  };

  const deleteClassFn = (id: string) => {
    deleteClass(id).catch(() => {});
    setRawClasses((prev) => prev.filter((c) => c.id !== id));
  };

  const enrollStudentInClassFn = (classId: string, studentId: string) => {
    enrollStudent(classId, studentId)
      .then((row) => setRawClassEnrollments((prev) => (prev.some((e) => e.id === row.id) ? prev : [...prev, row])))
      .catch(() => {});
  };

  const unenrollStudentFromClassFn = (classId: string, studentId: string) => {
    unenrollStudent(classId, studentId).catch(() => {});
    setRawClassEnrollments((prev) => prev.filter((e) => !(e.class_id === classId && e.student_id === studentId)));
  };

  const classByIdMap = useMemo(() => new Map(rawClasses.map((c) => [c.id, c])), [rawClasses]);
  const subjectCatalogNameById = useMemo(() => new Map(rawSubjectCatalog.map((s) => [s.id, s.name])), [rawSubjectCatalog]);

  /** Whether this student is in the roster of the given class (section roster, or manual enrollment). */
  const isStudentInClass = (classId: string, studentId: string): boolean => {
    const cls = classByIdMap.get(classId);
    if (!cls) return true; // unlinked/unknown class — fail open rather than hide the period
    return classRosterStudentIds(cls).includes(studentId);
  };

  const sectionPeriods = useMemo(
    (): SectionPeriod[] =>
      rawSectionPeriods.map((p) => {
        const cls = p.class_id ? classByIdMap.get(p.class_id) : undefined;
        return {
          id: p.id,
          sectionId: p.section_id,
          classId: p.class_id,
          subjectId: p.teacher_id ?? "general",
          subjectLabel: cls ? subjectCatalogNameById.get(cls.subject_id) ?? p.subject_label : p.subject_label,
          teacherName: cls
            ? usersById.get(cls.teacher_id)?.name
            : p.teacher_id
              ? usersById.get(p.teacher_id)?.name
              : undefined,
          day: p.day,
          startTime: p.start_time,
          endTime: p.end_time,
          room: p.room ?? "—",
        };
      }),
    [rawSectionPeriods, usersById, classByIdMap, subjectCatalogNameById],
  );

  const myClassSchedule = useMemo((): ClassPeriod[] => {
    if (!perspectiveStudentId) return [];
    const sectionId = usersById.get(perspectiveStudentId)?.section_id;
    if (!sectionId) return [];
    return sectionPeriods
      .filter((p) => p.sectionId === sectionId)
      .filter((p) => !p.classId || isStudentInClass(p.classId, perspectiveStudentId))
      .map((p) => ({ id: p.id, subjectId: p.subjectId, day: p.day, startTime: p.startTime, endTime: p.endTime, room: p.room }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [perspectiveStudentId, usersById, sectionPeriods, rawClasses, rawClassEnrollments]);

  const addSection = async (name: string, grade?: number): Promise<ClassSection> => {
    const row = await createSection({ name, grade });
    return { id: row.id, name: row.name, grade: row.grade };
  };

  const removeSection = (id: string) => {
    deleteSection(id).catch(() => {});
  };

  const addSectionPeriod = (input: NewSectionPeriodInput) => {
    const cls = rawClasses.find((c) => c.id === input.classId);
    if (!cls) return;
    createSectionPeriod({
      sectionId: input.sectionId,
      day: input.day,
      startTime: input.startTime,
      endTime: input.endTime,
      classId: input.classId,
      subjectLabel: rawSubjectCatalog.find((s) => s.id === cls.subject_id)?.name ?? "Subject",
      teacherId: cls.teacher_id,
      room: input.room,
    }).catch(() => {});
  };

  const removeSectionPeriod = (id: string) => {
    deleteSectionPeriod(id).catch(() => {});
  };

  /** Admin-only — every real student with their current section, for the "add students to this section" picker. */
  const sectionStudentRoster = useMemo((): SectionStudentRosterEntry[] => {
    if (profile.role !== "admin") return [];
    return students.map((s) => ({ id: s.id, name: s.name, grade: s.grade, sectionId: s.section_id }));
  }, [profile.role, students]);

  const assignStudentToSection = async (studentId: string, sectionId: string | null): Promise<void> => {
    await setStudentSection(studentId, sectionId);
  };

  /** Subjects actually visible to this student: their section's periods, minus any they're not in the roster of. */
  const subjectLabelsForStudent = (studentId: string): string[] => {
    const sectionId = usersById.get(studentId)?.section_id;
    if (!sectionId) return [];
    const labels: string[] = [];
    for (const p of sectionPeriods) {
      if (p.sectionId !== sectionId) continue;
      if (p.classId && !isStudentInClass(p.classId, studentId)) continue;
      if (!labels.includes(p.subjectLabel)) labels.push(p.subjectLabel);
    }
    return labels;
  };

  const gradeFeeRateByGrade = useMemo(
    () => new Map(rawGradeFeeRates.map((r) => [r.grade, r.amount])),
    [rawGradeFeeRates],
  );
  const subjectFeeRateByLabel = useMemo(
    () =>
      new Map(
        rawSubjectFeeRates.filter((r) => !r.is_general && r.subject_label).map((r) => [r.subject_label as string, r.amount]),
      ),
    [rawSubjectFeeRates],
  );
  const generalSubjectFeeRate = useMemo(
    () => rawSubjectFeeRates.find((r) => r.is_general)?.amount,
    [rawSubjectFeeRates],
  );
  const gradeFeePaymentByStudent = useMemo(
    () => new Map(rawGradeFeePayments.map((p) => [p.student_id, p])),
    [rawGradeFeePayments],
  );
  const subjectFeePaymentByKey = useMemo(() => {
    const m = new Map<string, RawSubjectFeePayment>();
    for (const p of rawSubjectFeePayments) m.set(`${p.student_id}::${p.subject_label}`, p);
    return m;
  }, [rawSubjectFeePayments]);

  /** How many days after starting a priced subject a student can drop it with the fee waived. */
  const subjectDropGraceDays = rawFeeSettings?.subject_drop_grace_days ?? 7;

  const setSubjectDropGraceDaysFn = (days: number) => {
    upsertFeeSettings(days)
      .then((row) => setRawFeeSettings(row))
      .catch(() => {});
  };

  const toSubjectFeeEnrollment = (e: RawSubjectFeeEnrollment): SubjectFeeEnrollment => ({
    studentId: e.student_id,
    subjectLabel: e.subject_label,
    startedAt: e.started_at,
    droppedAt: e.dropped_at,
    feeWaived: e.fee_waived,
  });

  const subjectFeeEnrollmentFor = (studentId: string, subjectLabel: string): SubjectFeeEnrollment | undefined => {
    const row = subjectFeeEnrollmentByKey.get(`${studentId}::${subjectLabel}`);
    return row ? toSubjectFeeEnrollment(row) : undefined;
  };

  const subjectFeeEnrollmentByKey = useMemo(() => {
    const m = new Map<string, RawSubjectFeeEnrollment>();
    for (const e of rawSubjectFeeEnrollments) m.set(`${e.student_id}::${e.subject_label}`, e);
    return m;
  }, [rawSubjectFeeEnrollments]);

  const subjectFeeEnrollmentsByStudent = useMemo(() => {
    const m = new Map<string, RawSubjectFeeEnrollment[]>();
    for (const e of rawSubjectFeeEnrollments) {
      const arr = m.get(e.student_id) ?? [];
      arr.push(e);
      m.set(e.student_id, arr);
    }
    return m;
  }, [rawSubjectFeeEnrollments]);

  const gradeFeeRates = useMemo(
    (): GradeFeeRate[] => rawGradeFeeRates.map((r) => ({ grade: r.grade, amount: r.amount })),
    [rawGradeFeeRates],
  );
  const subjectFeeRates = useMemo(
    (): SubjectFeeRate[] =>
      rawSubjectFeeRates.map((r) => ({
        id: r.id,
        subjectLabel: r.subject_label ?? undefined,
        isGeneral: r.is_general,
        amount: r.amount,
      })),
    [rawSubjectFeeRates],
  );

  const studentFeeRoster = useMemo((): StudentFeeRosterEntry[] => {
    if (profile.role !== "admin") return [];
    return students.map((s) => {
      const activeLabels = subjectLabelsForStudent(s.id);
      // Keep a dropped-but-still-owed subject visible here too, so it doesn't vanish from the
      // admin's roster the moment it leaves the student's active schedule.
      const stillOwedDropped = (subjectFeeEnrollmentsByStudent.get(s.id) ?? [])
        .filter((e) => e.dropped_at && !e.fee_waived && !activeLabels.includes(e.subject_label))
        .map((e) => e.subject_label);
      return {
        id: s.id,
        name: s.name,
        grade: s.grade,
        subjectLabels: Array.from(new Set([...activeLabels, ...stillOwedDropped])),
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.role, students, sectionPeriods, usersById, rawClasses, rawClassEnrollments, subjectFeeEnrollmentsByStudent]);

  const feePlans = useMemo((): FeePlanSummary[] => {
    if (profile.role !== "admin") return [];
    const itemsByPlan = new Map<string, RawFeePlanItem[]>();
    for (const it of rawFeePlanItems) itemsByPlan.set(it.plan_id, [...(itemsByPlan.get(it.plan_id) ?? []), it]);
    const assignmentsByPlan = new Map<string, RawFeeAssignment[]>();
    for (const a of rawFeeAssignments) assignmentsByPlan.set(a.plan_id, [...(assignmentsByPlan.get(a.plan_id) ?? []), a]);
    const paymentByKey = new Map<string, RawFeeItemPayment>();
    for (const p of rawFeeItemPayments) paymentByKey.set(`${p.item_id}::${p.student_id}`, p);

    return rawFeePlans.map((plan) => {
      const items = (itemsByPlan.get(plan.id) ?? []).sort((a, b) => a.position - b.position);
      const assignments: FeePlanAssignmentRow[] = (assignmentsByPlan.get(plan.id) ?? []).map((a) => {
        let totalDue = 0;
        let totalPaid = 0;
        for (const it of items) {
          totalDue += it.amount;
          totalPaid += paymentByKey.get(`${it.id}::${a.student_id}`)?.paid_amount ?? 0;
        }
        return {
          studentId: a.student_id,
          studentName: usersById.get(a.student_id)?.name ?? "Student",
          totalDue,
          totalPaid,
          balance: totalDue - totalPaid,
        };
      });
      return {
        planId: plan.id,
        title: plan.title,
        kind: plan.kind,
        items: items.map((it): FeePlanItem => ({ id: it.id, label: it.label, amount: it.amount, dueDate: it.due_date ?? undefined })),
        assignments,
      };
    });
  }, [profile.role, rawFeePlans, rawFeePlanItems, rawFeeAssignments, rawFeeItemPayments, usersById]);

  const computeFeePlansFor = (studentId: string | null | undefined): StudentFeePlanView[] => {
    const assignedPlans: StudentFeePlanView[] = (() => {
      if (!studentId) return [];
      const theirAssignments = rawFeeAssignments.filter((a) => a.student_id === studentId);
      if (theirAssignments.length === 0) return [];
      const itemsByPlan = new Map<string, RawFeePlanItem[]>();
      for (const it of rawFeePlanItems) itemsByPlan.set(it.plan_id, [...(itemsByPlan.get(it.plan_id) ?? []), it]);
      const paymentByKey = new Map<string, RawFeeItemPayment>();
      for (const p of rawFeeItemPayments) paymentByKey.set(`${p.item_id}::${p.student_id}`, p);

      return theirAssignments.map((a) => {
        const plan = rawFeePlans.find((p) => p.id === a.plan_id);
        const kind = plan?.kind ?? "itemized";
        const items = (itemsByPlan.get(a.plan_id) ?? []).sort((x, y) => x.position - y.position);
        const itemViews: StudentFeeItemView[] = items.map((it) => {
          const payment = paymentByKey.get(`${it.id}::${studentId}`);
          return {
            id: it.id,
            label: it.label,
            amount: it.amount,
            dueDate: it.due_date ?? undefined,
            status: payment?.status ?? "unpaid",
            paidAmount: payment?.paid_amount ?? 0,
            paidAt: payment?.paid_at ?? undefined,
          };
        });
        const totalDue = itemViews.reduce((sum, it) => sum + it.amount, 0);
        const totalPaid = itemViews.reduce((sum, it) => sum + it.paidAmount, 0);
        return {
          planId: a.plan_id,
          title: plan?.title ?? "Fee Plan",
          kind,
          items: itemViews,
          totalDue,
          totalPaid,
          balance: totalDue - totalPaid,
        };
      });
    })();

    const extras: StudentFeePlanView[] = [];
    const them = studentId ? usersById.get(studentId) : undefined;

    if (feesGradeBasedEnabled && studentId && them?.grade != null) {
      const amount = gradeFeeRateByGrade.get(them.grade);
      if (amount !== undefined) {
        const payment = gradeFeePaymentByStudent.get(studentId);
        const item: StudentFeeItemView = {
          id: "grade-fee",
          label: `Grade ${them.grade} Fee`,
          amount,
          status: payment?.status ?? "unpaid",
          paidAmount: payment?.paid_amount ?? 0,
          paidAt: payment?.paid_at ?? undefined,
        };
        extras.push({
          planId: "grade-fee",
          title: "Grade Fee",
          kind: "itemized",
          items: [item],
          totalDue: amount,
          totalPaid: item.paidAmount,
          balance: amount - item.paidAmount,
        });
      }
    }

    if (feesSubjectBasedEnabled && studentId) {
      const activeLabels = subjectLabelsForStudent(studentId);
      // A dropped subject keeps billing (past the grace period) until paid, even once it's no
      // longer in the student's current schedule — unless it was dropped within the grace period,
      // in which case upsertSubjectFeeEnrollment already marked it fee_waived and it's excluded.
      const stillOwedDropped = (subjectFeeEnrollmentsByStudent.get(studentId) ?? [])
        .filter((e) => e.dropped_at && !e.fee_waived && !activeLabels.includes(e.subject_label))
        .map((e) => e.subject_label);
      const labels = Array.from(new Set([...activeLabels, ...stillOwedDropped]));
      const items: StudentFeeItemView[] = [];
      for (const label of labels) {
        const amount = subjectFeeRateByLabel.get(label) ?? generalSubjectFeeRate;
        if (amount === undefined) continue;
        const isActive = activeLabels.includes(label);
        const enrollment = subjectFeeEnrollmentByKey.get(`${studentId}::${label}`);
        const dropped = !isActive && !!enrollment?.dropped_at;
        const payment = subjectFeePaymentByKey.get(`${studentId}::${label}`);
        items.push({
          id: `subject-fee:${label}`,
          label: dropped ? `${label} (dropped)` : label,
          amount,
          status: payment?.status ?? "unpaid",
          paidAmount: payment?.paid_amount ?? 0,
          paidAt: payment?.paid_at ?? undefined,
        });
      }
      if (items.length > 0) {
        const totalDue = items.reduce((sum, it) => sum + it.amount, 0);
        const totalPaid = items.reduce((sum, it) => sum + it.paidAmount, 0);
        extras.push({
          planId: "subject-fees",
          title: "Subject Fees",
          kind: "itemized",
          items,
          totalDue,
          totalPaid,
          balance: totalDue - totalPaid,
        });
      }
    }

    return [...assignedPlans, ...extras];
  };

  const feePlansDeps = [
    rawFeeAssignments,
    rawFeePlans,
    rawFeePlanItems,
    rawFeeItemPayments,
    usersById,
    feesGradeBasedEnabled,
    feesSubjectBasedEnabled,
    gradeFeeRateByGrade,
    subjectFeeRateByLabel,
    generalSubjectFeeRate,
    gradeFeePaymentByStudent,
    subjectFeePaymentByKey,
    sectionPeriods,
    rawClasses,
    rawClassEnrollments,
    subjectFeeEnrollmentByKey,
    subjectFeeEnrollmentsByStudent,
  ];

  const myFeePlans = useMemo(
    () => computeFeePlansFor(perspectiveStudentId),
    [perspectiveStudentId, ...feePlansDeps],
  );

  const studentFeeOverviews = useMemo((): StudentFeeOverview[] => {
    if (profile.role !== "admin") return [];
    return students.map((s) => ({
      studentId: s.id,
      studentName: s.name,
      plans: computeFeePlansFor(s.id),
    }));
  }, [profile.role, students, ...feePlansDeps]);

  const createFeePlanFn = async (input: NewFeePlanInput) => {
    const { plan, items } = await createFeePlan({
      createdBy: profile.id,
      title: input.title,
      kind: input.kind,
      items: input.items,
    });
    setRawFeePlans((prev) => [plan, ...prev]);
    setRawFeePlanItems((prev) => [...prev, ...items]);
    if (input.assignedStudentIds && input.assignedStudentIds.length > 0) {
      const rows = await assignFeePlan(plan.id, input.assignedStudentIds);
      setRawFeeAssignments((prev) => [...prev, ...rows]);
    }
  };

  const assignFeePlanFn = (planId: string, studentIds: string[]) => {
    assignFeePlan(planId, studentIds)
      .then((rows) => setRawFeeAssignments((prev) => [...prev, ...rows]))
      .catch(() => {});
  };

  const unassignFeePlanFn = (planId: string, studentId: string) => {
    unassignFeePlan(planId, studentId)
      .then(() =>
        setRawFeeAssignments((prev) => prev.filter((a) => !(a.plan_id === planId && a.student_id === studentId))),
      )
      .catch(() => {});
  };

  const deleteFeePlanFn = (planId: string) => {
    deleteFeePlan(planId)
      .then(() => {
        setRawFeePlans((prev) => prev.filter((p) => p.id !== planId));
        setRawFeePlanItems((prev) => prev.filter((it) => it.plan_id !== planId));
        setRawFeeAssignments((prev) => prev.filter((a) => a.plan_id !== planId));
      })
      .catch(() => {});
  };

  const setFeeItemPaymentFn = (itemId: string, studentId: string, status: FeePaymentStatus, paidAmount: number) => {
    upsertFeeItemPayment({
      itemId,
      studentId,
      status,
      paidAmount,
      paidAt: status === "unpaid" ? null : new Date().toISOString(),
    })
      .then((row) =>
        setRawFeeItemPayments((prev) => {
          const idx = prev.findIndex((p) => p.item_id === row.item_id && p.student_id === row.student_id);
          if (idx === -1) return [...prev, row];
          const next = [...prev];
          next[idx] = row;
          return next;
        }),
      )
      .catch(() => {});
  };

  const setGradeFeeRateFn = (grade: number, amount: number | null) => {
    upsertGradeFeeRate(grade, amount)
      .then(() => fetchGradeFeeRates().then(setRawGradeFeeRates))
      .catch(() => {});
  };

  const setSubjectFeeRateFn = (input: { id?: string; subjectLabel?: string; isGeneral?: boolean; amount: number }) => {
    upsertSubjectFeeRate(input)
      .then((row) =>
        setRawSubjectFeeRates((prev) => {
          const idx = prev.findIndex((r) => r.id === row.id);
          if (idx === -1) return [...prev, row];
          const next = [...prev];
          next[idx] = row;
          return next;
        }),
      )
      .catch(() => {});
  };

  const removeSubjectFeeRateFn = (id: string) => {
    deleteSubjectFeeRate(id)
      .then(() => setRawSubjectFeeRates((prev) => prev.filter((r) => r.id !== id)))
      .catch(() => {});
  };

  const setGradeFeePaymentFn = (studentId: string, status: FeePaymentStatus, paidAmount: number) => {
    upsertGradeFeePayment({ studentId, status, paidAmount })
      .then((row) =>
        setRawGradeFeePayments((prev) => {
          const idx = prev.findIndex((p) => p.student_id === row.student_id);
          if (idx === -1) return [...prev, row];
          const next = [...prev];
          next[idx] = row;
          return next;
        }),
      )
      .catch(() => {});
  };

  const setSubjectFeePaymentFn = (studentId: string, subjectLabel: string, status: FeePaymentStatus, paidAmount: number) => {
    upsertSubjectFeePayment({ studentId, subjectLabel, status, paidAmount })
      .then((row) =>
        setRawSubjectFeePayments((prev) => {
          const idx = prev.findIndex((p) => p.student_id === row.student_id && p.subject_label === row.subject_label);
          if (idx === -1) return [...prev, row];
          const next = [...prev];
          next[idx] = row;
          return next;
        }),
      )
      .catch(() => {});
  };

  const upsertSubjectFeeEnrollmentLocal = (row: RawSubjectFeeEnrollment) => {
    setRawSubjectFeeEnrollments((prev) => {
      const idx = prev.findIndex((e) => e.student_id === row.student_id && e.subject_label === row.subject_label);
      if (idx === -1) return [...prev, row];
      const next = [...prev];
      next[idx] = row;
      return next;
    });
  };

  /** Lazily records "this student started taking this subject today" the first time we notice — idempotent. */
  const ensureSubjectFeeEnrollmentFn = (studentId: string, subjectLabel: string) => {
    if (subjectFeeEnrollmentByKey.has(`${studentId}::${subjectLabel}`)) return;
    upsertSubjectFeeEnrollment({ studentId, subjectLabel }).then(upsertSubjectFeeEnrollmentLocal).catch(() => {});
  };

  /**
   * Records a student dropping a priced subject on the given date. If that date falls within the
   * grace period after they started, the fee is waived (removed from their account); otherwise it
   * still shows as owed until paid, even though they're no longer taking it.
   */
  const dropSubjectFeeFn = async (
    studentId: string,
    subjectLabel: string,
    droppedAtIso: string,
    startedAtIso?: string,
  ): Promise<void> => {
    const existing = subjectFeeEnrollmentByKey.get(`${studentId}::${subjectLabel}`);
    const startedAt = startedAtIso ?? existing?.started_at ?? new Date().toISOString();
    const elapsedDays = (new Date(droppedAtIso).getTime() - new Date(startedAt).getTime()) / 86_400_000;
    const feeWaived = elapsedDays < subjectDropGraceDays;
    const row = await upsertSubjectFeeEnrollment({
      studentId,
      subjectLabel,
      startedAt,
      droppedAt: droppedAtIso,
      feeWaived,
    });
    upsertSubjectFeeEnrollmentLocal(row);
  };

  /** Undoes a drop — the student is back on the hook for this subject as a fresh enrollment. */
  const reactivateSubjectFeeFn = async (studentId: string, subjectLabel: string): Promise<void> => {
    const row = await upsertSubjectFeeEnrollment({
      studentId,
      subjectLabel,
      startedAt: new Date().toISOString(),
      droppedAt: null,
      feeWaived: false,
    });
    upsertSubjectFeeEnrollmentLocal(row);
  };

  const sortedRawAssignments = useMemo(
    () => [...rawAssignments].sort((a, b) => a.due_date.localeCompare(b.due_date)),
    [rawAssignments],
  );

  const mergedAssignments = useMemo(() => {
    return sortedRawAssignments.map((a) =>
      toAssignment(a, perspectiveStudentId ? submissionByKey.get(`${a.id}::${perspectiveStudentId}`) : undefined),
    );
  }, [sortedRawAssignments, submissionByKey, perspectiveStudentId]);

  // Retention is applied immediately for display (matching mock mode), and persisted back to
  // Supabase in the background so storage actually shrinks rather than just being masked locally.
  const assignments = useMemo(() => applyRetentionPolicy(mergedAssignments).assignments, [mergedAssignments]);

  const teacherAssignmentResults = useMemo((): TeacherAssignmentSummary[] => {
    return rawAssignments
      .filter((a) => a.teacher_id === profile.id)
      .map((a) => {
        const targetIds = a.assigned_student_ids ?? students.map((s) => s.id);
        return {
          assignmentId: a.id,
          title: a.title,
          subjectLabel: a.subject_label,
          dueDate: a.due_date,
          assignedCount: targetIds.length,
          submissions: targetIds.map((sid) => {
            const sub = submissionByKey.get(`${a.id}::${sid}`);
            return {
              studentId: sid,
              studentName: usersById.get(sid)?.name ?? "Student",
              status: sub?.status ?? "not_started",
              submittedAt: sub?.submitted_at ?? undefined,
              submission: toSubmission(sub),
              review: toReview(sub),
            };
          }),
        };
      });
  }, [rawAssignments, submissionByKey, usersById, profile.id, students]);

  useEffect(() => {
    if (mergedAssignments.length === 0) return;
    assignments.forEach((cleanedAssignment, i) => {
      const original = mergedAssignments[i];
      if (cleanedAssignment.attachments !== original.attachments) {
        const raw = rawAssignments.find((a) => a.id === cleanedAssignment.id);
        if (raw) {
          const nextAttachments: RawAttachment[] = cleanedAssignment.attachments.map((att) => ({
            id: att.id,
            type: att.type,
            name: att.name,
            detail: att.detail,
            dataUrl: att.dataUrl,
            fileRemovedAt: att.fileRemovedAt,
          }));
          purgeAssignmentAttachments(raw.id, nextAttachments).catch(() => {});
        }
      }
      if (cleanedAssignment.submission !== original.submission && cleanedAssignment.submission?.fileRemovedAt) {
        upsertSubmissionRow({
          assignment_id: cleanedAssignment.id,
          student_id: perspectiveStudentId!,
          data_url: null,
          file_removed_at: cleanedAssignment.submission.fileRemovedAt,
        }).catch(() => {});
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mergedAssignments, assignments]);

  const attendanceRecords = useMemo(
    () => rawAttendance.map((r) => toAttendanceRecord(r, usersById.get(r.student_id)?.name)),
    [rawAttendance, usersById],
  );

  const riskSnapshots = useMemo((): StudentRiskSnapshot[] => {
    if (profile.role !== "teacher" && profile.role !== "admin" && profile.role !== "parent") return [];
    const targetStudents =
      profile.role === "parent" ? students.filter((s) => s.id === profile.linked_student_id) : students;
    return targetStudents.map((s) => ({
      studentId: s.id,
      studentName: s.name,
      attendanceRecords: rawAttendance.filter((r) => r.student_id === s.id).map((r) => toAttendanceRecord(r, s.name)),
      assignments: sortedRawAssignments.map((a) => toAssignment(a, submissionByKey.get(`${a.id}::${s.id}`))),
      quizScores: rawQuizAttempts
        .filter((a) => a.student_id === s.id)
        .map((a) => ({ score: a.score, outOf: a.out_of, submittedAt: a.submitted_at })),
    }));
  }, [profile, students, rawAttendance, sortedRawAssignments, submissionByKey, rawQuizAttempts]);

  const subjectIdsForVisibility = useMemo(() => subjectList.map((s) => s.id), [subjectList]);

  const announcements = useMemo(() => {
    // Admins oversee every announcement they or any teacher sent, regardless of audience.
    if (profile.role === "admin") {
      return rawAnnouncements.map(toAnnouncement).sort((a, b) => b.date.localeCompare(a.date));
    }
    const myId = perspectiveStudentId;
    const myGrade = myId ? usersById.get(myId)?.grade ?? null : null;
    return rawAnnouncements
      .map(toAnnouncement)
      .filter((a) => {
        if (a.audience.type === "class") {
          // Every real student is enrolled in every real teacher's class.
          return subjectIdsForVisibility.includes(a.audience.subjectId ?? "");
        }
        if (a.audience.type === "grade") return a.audience.grade === myGrade;
        if (a.audience.type === "students") return myId ? (a.audience.studentIds?.includes(myId) ?? false) : false;
        if (a.audience.type === "school") return true;
        return false;
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [rawAnnouncements, perspectiveStudentId, usersById, subjectIdsForVisibility, profile.role]);

  const announcementsForParent = useMemo(() => {
    const myId = perspectiveStudentId;
    const myGrade = myId ? usersById.get(myId)?.grade ?? null : null;
    return rawAnnouncements
      .map(toAnnouncement)
      .filter((a) => {
        if (a.audience.type === "parents") return true;
        if (a.audience.type === "teachers") return false;
        if (a.audience.type === "class") return subjectIdsForVisibility.includes(a.audience.subjectId ?? "");
        if (a.audience.type === "grade") return a.audience.grade === myGrade;
        if (a.audience.type === "students") return myId ? (a.audience.studentIds?.includes(myId) ?? false) : false;
        if (a.audience.type === "school") return true;
        return false;
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [rawAnnouncements, perspectiveStudentId, usersById, subjectIdsForVisibility]);

  const quizAttemptByKey = useMemo(() => {
    const m = new Map<string, RawQuizAttempt>();
    for (const a of rawQuizAttempts) m.set(`${a.quiz_id}::${a.student_id}`, a);
    return m;
  }, [rawQuizAttempts]);

  const examGradeByKey = useMemo(() => {
    const m = new Map<string, RawExamGrade>();
    for (const g of rawExamGrades) m.set(`${g.exam_id}::${g.student_id}`, g);
    return m;
  }, [rawExamGrades]);

  const quizWeightOverrideByKey = useMemo(() => {
    const m = new Map<string, number>();
    for (const o of rawQuizWeightOverrides) m.set(`${o.quiz_id}::${o.student_id}`, o.weight_percent);
    return m;
  }, [rawQuizWeightOverrides]);

  const examWeightOverrideByKey = useMemo(() => {
    const m = new Map<string, number>();
    for (const o of rawExamWeightOverrides) m.set(`${o.exam_id}::${o.student_id}`, o.weight_percent);
    return m;
  }, [rawExamWeightOverrides]);

  const quizzes = useMemo(() => {
    return [...rawQuizzes]
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .map((q) => {
        const quiz = toQuiz(
          q,
          usersById.get(q.teacher_id)?.name ?? "Teacher",
          perspectiveStudentId ? quizAttemptByKey.get(`${q.id}::${perspectiveStudentId}`) : undefined,
        );
        const override = perspectiveStudentId ? quizWeightOverrideByKey.get(`${q.id}::${perspectiveStudentId}`) : undefined;
        quiz.myWeightPercent = override ?? quiz.weightPercent;
        return quiz;
      });
  }, [rawQuizzes, usersById, quizAttemptByKey, quizWeightOverrideByKey, perspectiveStudentId]);

  const tests = useMemo(
    () =>
      [...rawExams].sort((a, b) => a.date.localeCompare(b.date)).map((e) => {
        const test = toTestEvent(e, perspectiveStudentId ? examGradeByKey.get(`${e.id}::${perspectiveStudentId}`) : undefined);
        const override = perspectiveStudentId ? examWeightOverrideByKey.get(`${e.id}::${perspectiveStudentId}`) : undefined;
        test.myWeightPercent = override ?? test.weightPercent;
        return test;
      }),
    [rawExams, examGradeByKey, examWeightOverrideByKey, perspectiveStudentId],
  );

  const addExam = (input: NewExamInput) => {
    const resolvedClassId = input.classId ?? myTeacherClasses[0]?.id;
    const resolvedClass = resolvedClassId ? myTeacherClasses.find((c) => c.id === resolvedClassId) : undefined;
    createExam({
      teacherId: profile.id,
      classId: resolvedClassId,
      title: input.title,
      subjectLabel: resolvedClass?.subjectName ?? profile.subject_name ?? "General",
      kind: input.kind,
      date: input.date,
      detail: input.detail,
      assignedStudentIds: input.assignedStudentIds,
      weightPercent: input.weightPercent,
    })
      .then((row) => setRawExams((prev) => (prev.some((x) => x.id === row.id) ? prev : [...prev, row])))
      .catch(() => {});
  };

  const setExamGrade = (examId: string, studentId: string, score: number, outOf: number) => {
    upsertExamGrade({ examId, studentId, score, outOf })
      .then((row) =>
        setRawExamGrades((prev) => {
          const idx = prev.findIndex((g) => g.exam_id === row.exam_id && g.student_id === row.student_id);
          if (idx === -1) return [...prev, row];
          const next = [...prev];
          next[idx] = row;
          return next;
        }),
      )
      .catch(() => {});
  };

  const updateQuizWeightFn = (quizId: string, weightPercent: number | null) => {
    updateQuizWeight(quizId, weightPercent)
      .then((row) => setRawQuizzes((prev) => prev.map((q) => (q.id === row.id ? row : q))))
      .catch(() => {});
  };

  const updateExamWeightFn = (examId: string, weightPercent: number | null) => {
    updateExamWeight(examId, weightPercent)
      .then((row) => setRawExams((prev) => prev.map((e) => (e.id === row.id ? row : e))))
      .catch(() => {});
  };

  const setQuizWeightOverride = (quizId: string, studentId: string, weightPercent: number | null) => {
    const apply = weightPercent === null
      ? deleteQuizWeightOverride(quizId, studentId).then(() => {
          setRawQuizWeightOverrides((prev) => prev.filter((o) => !(o.quiz_id === quizId && o.student_id === studentId)));
        })
      : upsertQuizWeightOverride({ quizId, studentId, weightPercent }).then((row) =>
          setRawQuizWeightOverrides((prev) => {
            const idx = prev.findIndex((o) => o.quiz_id === row.quiz_id && o.student_id === row.student_id);
            if (idx === -1) return [...prev, row];
            const next = [...prev];
            next[idx] = row;
            return next;
          }),
        );
    apply.catch(() => {});
  };

  const setExamWeightOverride = (examId: string, studentId: string, weightPercent: number | null) => {
    const apply = weightPercent === null
      ? deleteExamWeightOverride(examId, studentId).then(() => {
          setRawExamWeightOverrides((prev) => prev.filter((o) => !(o.exam_id === examId && o.student_id === studentId)));
        })
      : upsertExamWeightOverride({ examId, studentId, weightPercent }).then((row) =>
          setRawExamWeightOverrides((prev) => {
            const idx = prev.findIndex((o) => o.exam_id === row.exam_id && o.student_id === row.student_id);
            if (idx === -1) return [...prev, row];
            const next = [...prev];
            next[idx] = row;
            return next;
          }),
        );
    apply.catch(() => {});
  };

  const gradingDefaults = useMemo(
    () => ({
      quizWeight: rawGradingDefaults?.quiz_weight ?? undefined,
      examWeight: rawGradingDefaults?.exam_weight ?? undefined,
    }),
    [rawGradingDefaults],
  );

  const setGradingDefaults = (input: { quizWeight?: number | null; examWeight?: number | null }) => {
    upsertGradingDefaults({
      teacherId: profile.id,
      quizWeight: input.quizWeight ?? rawGradingDefaults?.quiz_weight ?? null,
      examWeight: input.examWeight ?? rawGradingDefaults?.exam_weight ?? null,
    })
      .then((row) => setRawGradingDefaults(row))
      .catch(() => {});
  };

  /** A quiz/exam's own class roster size, falling back to the whole school for pre-Classes rows with no class_id. */
  const rosterSizeForClass = (classId: string | null): number => {
    if (!classId) return students.length;
    const cls = classByIdMap.get(classId);
    return cls ? classRosterStudentIds(cls).length : students.length;
  };

  const teacherQuizResults = useMemo((): TeacherQuizSummary[] => {
    return rawQuizzes
      .filter((q) => q.teacher_id === profile.id)
      .map((q) => ({
        quizId: q.id,
        classId: q.class_id ?? undefined,
        title: q.title,
        subjectLabel: q.section ?? "Class",
        dueDate: q.due_date ?? undefined,
        totalQuestions: q.questions.length,
        assignedCount: q.assigned_student_ids?.length ?? rosterSizeForClass(q.class_id),
        weightPercent: q.weight_percent ?? undefined,
        results: rawQuizAttempts
          .filter((a) => a.quiz_id === q.id)
          .map((a) => ({
            studentId: a.student_id,
            studentName: usersById.get(a.student_id)?.name ?? "Student",
            score: a.score,
            outOf: a.out_of,
            submittedAt: a.submitted_at,
            weightPercent: quizWeightOverrideByKey.get(`${q.id}::${a.student_id}`) ?? q.weight_percent ?? undefined,
          })),
      }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawQuizzes, rawQuizAttempts, usersById, profile.id, students.length, quizWeightOverrideByKey, rawClasses, rawClassEnrollments]);

  const teacherExamResults = useMemo((): TeacherExamSummary[] => {
    return rawExams
      .filter((e) => e.teacher_id === profile.id)
      .map((e) => ({
        examId: e.id,
        classId: e.class_id ?? undefined,
        title: e.title,
        subjectLabel: e.subject_label,
        kind: e.kind,
        date: e.date,
        weightPercent: e.weight_percent ?? undefined,
        assignedCount: e.assigned_student_ids?.length ?? rosterSizeForClass(e.class_id),
        grades: rawExamGrades
          .filter((g) => g.exam_id === e.id)
          .map((g) => ({
            studentId: g.student_id,
            studentName: usersById.get(g.student_id)?.name ?? "Student",
            score: g.score,
            outOf: g.out_of,
            submittedAt: g.graded_at,
            weightPercent: examWeightOverrideByKey.get(`${e.id}::${g.student_id}`) ?? e.weight_percent ?? undefined,
          })),
      }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawExams, rawExamGrades, usersById, profile.id, students.length, examWeightOverrideByKey, rawClasses, rawClassEnrollments]);

  const submitQuizAnswers = async (quizId: string, answers: number[]): Promise<QuizSubmitResult> => {
    if (!perspectiveStudentId) throw new Error("Only a student can take a quiz");
    const raw = rawQuizzes.find((q) => q.id === quizId);
    if (!raw) throw new Error("Quiz not found");
    const result = scoreQuiz(raw.questions.map(toQuizQuestion), answers);
    const row = await submitQuizAttempt({
      quizId,
      studentId: perspectiveStudentId,
      answers,
      score: result.score,
      outOf: result.outOf,
    });
    setRawQuizAttempts((prev) => (prev.some((x) => x.id === row.id) ? prev : [...prev, row]));
    return result;
  };

  const setAssignmentStatus = (id: string, status: AssignmentStatus) => {
    if (!perspectiveStudentId) return;
    setRawSubmissions((prev) => {
      const idx = prev.findIndex((s) => s.assignment_id === id && s.student_id === perspectiveStudentId);
      if (idx === -1) return prev;
      const next = [...prev];
      next[idx] = { ...next[idx], status };
      return next;
    });
    upsertSubmissionRow({ assignment_id: id, student_id: perspectiveStudentId, status }).catch(() => {});
  };

  const cycleAssignmentStatus = (id: string) => {
    const current = assignments.find((a) => a.id === id);
    if (!current) return;
    const currentIndex = STATUS_ORDER.indexOf(current.status);
    setAssignmentStatus(id, STATUS_ORDER[(currentIndex + 1) % STATUS_ORDER.length]);
  };

  const submitAssignmentWork = (id: string, submission: Submission) => {
    if (!perspectiveStudentId) return;
    upsertSubmissionRow({
      assignment_id: id,
      student_id: perspectiveStudentId,
      status: "completed",
      kind: submission.kind,
      file_name: submission.fileName ?? null,
      file_type: submission.fileType ?? null,
      data_url: submission.dataUrl ?? null,
      text_content: submission.textContent ?? null,
      submitted_at: submission.submittedAt,
      review_status: null,
      review_score: null,
      review_out_of: null,
      review_feedback: null,
      reviewed_at: null,
    })
      .then((row) => setRawSubmissions((prev) => {
        const idx = prev.findIndex((s) => s.id === row.id);
        if (idx === -1) return [...prev, row];
        const next = [...prev];
        next[idx] = row;
        return next;
      }))
      .catch(() => {});
  };

  const clearAssignmentSubmission = (id: string) => {
    if (!perspectiveStudentId) return;
    upsertSubmissionRow({
      assignment_id: id,
      student_id: perspectiveStudentId,
      kind: null,
      file_name: null,
      file_type: null,
      data_url: null,
      text_content: null,
      submitted_at: null,
      review_status: null,
      review_score: null,
      review_out_of: null,
      review_feedback: null,
      reviewed_at: null,
    })
      .then((row) => setRawSubmissions((prev) => {
        const idx = prev.findIndex((s) => s.id === row.id);
        if (idx === -1) return [...prev, row];
        const next = [...prev];
        next[idx] = row;
        return next;
      }))
      .catch(() => {});
  };

  const addAssignment = (input: NewAssignmentInput) => {
    const resolvedClassId = input.classId ?? myTeacherClasses[0]?.id;
    const resolvedClass = resolvedClassId ? myTeacherClasses.find((c) => c.id === resolvedClassId) : undefined;
    createAssignment({
      teacherId: profile.id,
      classId: resolvedClassId,
      subjectLabel: resolvedClass?.subjectName ?? profile.subject_name ?? "General",
      title: input.title,
      chapter: input.chapter,
      exercises: input.exercises,
      dueDate: input.dueDate,
      submissionEnabled: input.submissionEnabled,
      attachments: (input.attachments ?? []).map((att) => ({
        id: att.id,
        type: att.type,
        name: att.name,
        detail: att.detail,
        dataUrl: att.dataUrl,
        fileRemovedAt: att.fileRemovedAt,
      })),
      assignedStudentIds: input.assignedStudentIds,
    })
      .then((row) => setRawAssignments((prev) => (prev.some((x) => x.id === row.id) ? prev : [...prev, row])))
      .catch(() => {});
  };

  const addAnnouncement = (input: NewAnnouncementInput) => {
    createAnnouncement({
      title: input.title,
      body: input.body,
      category: input.category,
      important: input.important,
      audienceType: input.audience.type,
      audienceLabel: input.audience.label,
      audienceGrade: input.audience.grade,
      audienceSubject: input.audience.subjectId,
      audienceStudentIds: input.audience.studentIds,
      authorId: profile.id,
    })
      .then((row) => setRawAnnouncements((prev) => (prev.some((x) => x.id === row.id) ? prev : [...prev, row])))
      .catch(() => {});
  };

  const addQuiz = (input: NewQuizInput) => {
    const resolvedClassId = input.classId ?? myTeacherClasses[0]?.id;
    createQuiz({
      teacherId: profile.id,
      classId: resolvedClassId,
      title: input.title,
      section: input.section,
      dueDate: input.dueDate,
      questions: input.questions,
      assignedStudentIds: input.assignedStudentIds,
      weightPercent: input.weightPercent,
    })
      .then((row) => setRawQuizzes((prev) => (prev.some((x) => x.id === row.id) ? prev : [...prev, row])))
      .catch(() => {});
  };

  const markAttendance = (studentId: string, date: string, status: AttendanceStatus, classId?: string) => {
    const resolvedClassId = classId ?? myTeacherClasses[0]?.id;
    const resolvedClass = resolvedClassId ? myTeacherClasses.find((c) => c.id === resolvedClassId) : undefined;
    markAttendanceRow({
      studentId,
      teacherId: profile.id,
      classId: resolvedClassId,
      subjectLabel: resolvedClass?.subjectName ?? profile.subject_name ?? undefined,
      date,
      status,
    })
      .then((row) =>
        setRawAttendance((prev) => {
          const idx = prev.findIndex((x) => x.id === row.id);
          if (idx === -1) return [...prev, row];
          const next = [...prev];
          next[idx] = row;
          return next;
        }),
      )
      .catch(() => {});
  };

  const value: AppDataContextValue = {
    subjects: subjectList,
    classSchedule: myClassSchedule,
    tests,
    announcements,
    announcementsForParent,
    assignments,
    attendanceRecords,
    riskSnapshots,
    realStudents: students.map((s) => ({ id: s.id, name: s.name })),
    teacherAssignmentResults,
    quizzes,
    teacherQuizResults,
    teacherExamResults,
    getSubject: (id: string) => subjectMap.get(id),
    setAssignmentStatus,
    cycleAssignmentStatus,
    submitAssignmentWork,
    clearAssignmentSubmission,
    addAssignment,
    addAnnouncement,
    markAttendance,
    addQuiz,
    submitQuizAnswers,
    addExam,
    setExamGrade,
    updateQuizWeight: updateQuizWeightFn,
    updateExamWeight: updateExamWeightFn,
    setQuizWeightOverride,
    setExamWeightOverride,
    gradingDefaults,
    setGradingDefaults,
    sectionsFeatureEnabled,
    gradebookFeatureEnabled,
    gradebookStudentOverridesEnabled,
    sections,
    sectionPeriods,
    addSection,
    removeSection,
    subjectCatalog,
    addSubjectCatalogEntry: addSubjectCatalogEntryFn,
    removeSubjectCatalogEntry: removeSubjectCatalogEntryFn,
    assignTeacherSubject,
    classes,
    myTeacherClasses,
    myEnrolledClasses,
    classRoster,
    createClass: createClassFn,
    deleteClass: deleteClassFn,
    enrollStudentInClass: enrollStudentInClassFn,
    unenrollStudentFromClass: unenrollStudentFromClassFn,
    addSectionPeriod,
    removeSectionPeriod,
    sectionStudentRoster,
    assignStudentToSection,
    feesFeatureEnabled,
    feesItemizedEnabled,
    feesGradeBasedEnabled,
    feesSubjectBasedEnabled,
    feePlans,
    myFeePlans,
    createFeePlan: createFeePlanFn,
    assignFeePlan: assignFeePlanFn,
    unassignFeePlan: unassignFeePlanFn,
    deleteFeePlan: deleteFeePlanFn,
    setFeeItemPayment: setFeeItemPaymentFn,
    gradeFeeRates,
    subjectFeeRates,
    studentFeeRoster,
    studentFeeOverviews,
    setGradeFeeRate: setGradeFeeRateFn,
    setSubjectFeeRate: setSubjectFeeRateFn,
    removeSubjectFeeRate: removeSubjectFeeRateFn,
    setGradeFeePayment: setGradeFeePaymentFn,
    setSubjectFeePayment: setSubjectFeePaymentFn,
    subjectDropGraceDays,
    setSubjectDropGraceDays: setSubjectDropGraceDaysFn,
    subjectFeeEnrollmentFor,
    ensureSubjectFeeEnrollment: ensureSubjectFeeEnrollmentFn,
    dropSubjectFee: dropSubjectFeeFn,
    reactivateSubjectFee: reactivateSubjectFeeFn,
  };

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

/** Mock, localStorage-backed app data — used when Supabase isn't configured (demo mode). */
function MockAppDataProvider({ children }: { children: ReactNode }) {
  const [assignments, setAssignments] = useState<Assignment[]>(() => loadAssignments());
  const [allAnnouncements, setAllAnnouncements] = useState<Announcement[]>(() => loadAnnouncements());
  const [mockQuizzes, setMockQuizzes] = useState<MockQuizRecord[]>(() => loadMockQuizzes());
  const [mockQuizAttempts, setMockQuizAttempts] = useState<Record<string, QuizAttempt>>(() =>
    loadMockQuizAttempts(),
  );
  const [mockExams, setMockExams] = useState<MockExamRecord[]>(() => loadMockExams());
  const [mockExamGrades, setMockExamGrades] = useState<Record<string, { score: number; outOf: number }>>(() =>
    loadMockExamGrades(),
  );
  const [mockQuizWeightOverrides, setMockQuizWeightOverrides] = useState<Record<string, number>>({});
  const [mockExamWeightOverrides, setMockExamWeightOverrides] = useState<Record<string, number>>({});

  useEffect(() => {
    try {
      localStorage.setItem(MOCK_EXAMS_KEY, JSON.stringify(mockExams));
    } catch {
      // ignore storage errors
    }
  }, [mockExams]);

  useEffect(() => {
    try {
      localStorage.setItem(MOCK_EXAM_GRADES_KEY, JSON.stringify(mockExamGrades));
    } catch {
      // ignore storage errors
    }
  }, [mockExamGrades]);

  useEffect(() => {
    try {
      localStorage.setItem(MOCK_QUIZZES_KEY, JSON.stringify(mockQuizzes));
    } catch {
      // ignore storage errors
    }
  }, [mockQuizzes]);

  useEffect(() => {
    try {
      localStorage.setItem(MOCK_QUIZ_ATTEMPTS_KEY, JSON.stringify(mockQuizAttempts));
    } catch {
      // ignore storage errors
    }
  }, [mockQuizAttempts]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(assignments));
    } catch {
      // storage quota exceeded (e.g. a large submitted file) - state still holds in memory
    }
  }, [assignments]);

  useEffect(() => {
    try {
      localStorage.setItem(ANNOUNCEMENTS_STORAGE_KEY, JSON.stringify(allAnnouncements));
    } catch {
      // ignore storage errors
    }
  }, [allAnnouncements]);

  const subjectMap = useMemo(() => new Map(mockSubjects.map((s) => [s.id, s])), []);

  const announcements = useMemo(() => {
    const subjectIds = mockSubjects.map((s) => s.id);
    return allAnnouncements
      .filter((a) => isVisibleToCurrentStudent(a.audience, subjectIds))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [allAnnouncements]);

  const announcementsForParent = useMemo(() => {
    const subjectIds = mockSubjects.map((s) => s.id);
    return allAnnouncements
      .filter((a) => isVisibleToCurrentParent(a.audience, subjectIds))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [allAnnouncements]);

  const quizzes = useMemo((): Quiz[] => {
    return [...mockQuizzes]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((q) => {
        const override = mockQuizWeightOverrides[`${q.id}::${CURRENT_STUDENT_ID}`];
        return {
          id: q.id,
          teacherName: mockTeacherProfile.name,
          subjectLabel: q.section,
          title: q.title,
          dueDate: q.dueDate,
          questions: q.questions,
          myAttempt: mockQuizAttempts[q.id],
          weightPercent: q.weightPercent,
          myWeightPercent: override ?? q.weightPercent,
        };
      });
  }, [mockQuizzes, mockQuizAttempts, mockQuizWeightOverrides]);

  const addQuiz = (input: NewQuizInput) => {
    const quiz: MockQuizRecord = {
      id: `quiz-${Date.now()}`,
      title: input.title,
      section: input.section ?? "Class",
      dueDate: input.dueDate ?? "",
      questions: input.questions,
      createdAt: new Date().toISOString(),
      weightPercent: input.weightPercent,
    };
    setMockQuizzes((prev) => [quiz, ...prev]);
  };

  const updateQuizWeight = (quizId: string, weightPercent: number | null) => {
    setMockQuizzes((prev) => prev.map((q) => (q.id === quizId ? { ...q, weightPercent: weightPercent ?? undefined } : q)));
  };

  const setQuizWeightOverride = (quizId: string, studentId: string, weightPercent: number | null) => {
    setMockQuizWeightOverrides((prev) => {
      const key = `${quizId}::${studentId}`;
      if (weightPercent === null) {
        const next = { ...prev };
        delete next[key];
        return next;
      }
      return { ...prev, [key]: weightPercent };
    });
  };

  const combinedTests = useMemo((): TestEvent[] => {
    const added: TestEvent[] = mockExams.map((e) => {
      const override = mockExamWeightOverrides[`${e.id}::${CURRENT_STUDENT_ID}`];
      return {
        id: e.id,
        subjectId: mockTeacherProfile.subjectId,
        title: e.title,
        date: e.date,
        kind: e.kind,
        detail: e.detail,
        createdAt: e.createdAt,
        weightPercent: e.weightPercent,
        myWeightPercent: override ?? e.weightPercent,
        myGrade: mockExamGrades[`${e.id}::${CURRENT_STUDENT_ID}`],
      };
    });
    return [...added, ...tests];
  }, [mockExams, mockExamGrades, mockExamWeightOverrides]);

  const addExam = (input: NewExamInput) => {
    const exam: MockExamRecord = {
      id: `exam-${Date.now()}`,
      title: input.title,
      date: input.date,
      kind: input.kind,
      detail: input.detail,
      createdAt: new Date().toISOString(),
      weightPercent: input.weightPercent,
    };
    setMockExams((prev) => [exam, ...prev]);
  };

  const updateExamWeight = (examId: string, weightPercent: number | null) => {
    setMockExams((prev) => prev.map((e) => (e.id === examId ? { ...e, weightPercent: weightPercent ?? undefined } : e)));
  };

  const setExamWeightOverride = (examId: string, studentId: string, weightPercent: number | null) => {
    setMockExamWeightOverrides((prev) => {
      const key = `${examId}::${studentId}`;
      if (weightPercent === null) {
        const next = { ...prev };
        delete next[key];
        return next;
      }
      return { ...prev, [key]: weightPercent };
    });
  };

  const setExamGrade = (examId: string, studentId: string, score: number, outOf: number) => {
    setMockExamGrades((prev) => ({ ...prev, [`${examId}::${studentId}`]: { score, outOf } }));
  };

  const [mockGradingDefaults, setMockGradingDefaults] = useState<{ quizWeight?: number; examWeight?: number }>({});
  const setGradingDefaults = (input: { quizWeight?: number | null; examWeight?: number | null }) => {
    setMockGradingDefaults((prev) => ({
      quizWeight: input.quizWeight === null ? undefined : input.quizWeight ?? prev.quizWeight,
      examWeight: input.examWeight === null ? undefined : input.examWeight ?? prev.examWeight,
    }));
  };

  const teacherExamResults = useMemo((): TeacherExamSummary[] => {
    return mockExams.map((e) => {
      const grade = mockExamGrades[`${e.id}::${CURRENT_STUDENT_ID}`];
      const override = mockExamWeightOverrides[`${e.id}::${CURRENT_STUDENT_ID}`];
      return {
        examId: e.id,
        title: e.title,
        subjectLabel: "Class",
        kind: e.kind,
        date: e.date,
        weightPercent: e.weightPercent,
        assignedCount: 1,
        grades: grade
          ? [
              {
                studentId: CURRENT_STUDENT_ID,
                studentName: "Amara Silva",
                score: grade.score,
                outOf: grade.outOf,
                submittedAt: new Date().toISOString(),
                weightPercent: override ?? e.weightPercent,
              },
            ]
          : [],
      };
    });
  }, [mockExams, mockExamGrades, mockExamWeightOverrides]);

  const submitQuizAnswers = async (quizId: string, answers: number[]): Promise<QuizSubmitResult> => {
    const quiz = mockQuizzes.find((q) => q.id === quizId);
    if (!quiz) throw new Error("Quiz not found");
    const result = scoreQuiz(quiz.questions, answers);
    const attempt: QuizAttempt = { answers, score: result.score, outOf: result.outOf, submittedAt: nowLocalIso() };
    setMockQuizAttempts((prev) => ({ ...prev, [quizId]: attempt }));
    return result;
  };

  const teacherQuizResults = useMemo((): TeacherQuizSummary[] => {
    return mockQuizzes.map((q) => {
      const attempt = mockQuizAttempts[q.id];
      const override = mockQuizWeightOverrides[`${q.id}::${CURRENT_STUDENT_ID}`];
      return {
        quizId: q.id,
        title: q.title,
        subjectLabel: q.section,
        dueDate: q.dueDate || undefined,
        totalQuestions: q.questions.length,
        assignedCount: 1,
        weightPercent: q.weightPercent,
        results: attempt
          ? [
              {
                studentId: CURRENT_STUDENT_ID,
                studentName: "Amara Silva",
                score: attempt.score,
                outOf: attempt.outOf,
                submittedAt: attempt.submittedAt,
                weightPercent: override ?? q.weightPercent,
              },
            ]
          : [],
      };
    });
  }, [mockQuizzes, mockQuizAttempts, mockQuizWeightOverrides]);

  const setAssignmentStatus = (id: string, status: AssignmentStatus) => {
    setAssignments((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
  };

  const cycleAssignmentStatus = (id: string) => {
    setAssignments((prev) =>
      prev.map((a) => {
        if (a.id !== id) return a;
        const currentIndex = STATUS_ORDER.indexOf(a.status);
        const next = STATUS_ORDER[(currentIndex + 1) % STATUS_ORDER.length];
        return { ...a, status: next };
      }),
    );
  };

  const submitAssignmentWork = (id: string, submission: Submission) => {
    setAssignments((prev) =>
      prev.map((a) =>
        a.id === id ? { ...a, submission, status: "completed", review: undefined } : a,
      ),
    );
  };

  const clearAssignmentSubmission = (id: string) => {
    setAssignments((prev) => prev.map((a) => (a.id === id ? { ...a, submission: undefined, review: undefined } : a)));
  };

  const addAssignment = (input: NewAssignmentInput) => {
    const assignment: Assignment = {
      id: `a-${Date.now()}`,
      subjectId: input.subjectId,
      title: input.title,
      chapter: input.chapter,
      exercises: input.exercises,
      dueDate: input.dueDate,
      status: "not_started",
      attachments: input.attachments ?? [],
      submissionEnabled: input.submissionEnabled,
    };
    setAssignments((prev) => [...prev, assignment]);
  };

  const addAnnouncement = (input: NewAnnouncementInput) => {
    const announcement: Announcement = {
      ...input,
      id: `an-${Date.now()}`,
      date: toIsoDate(new Date()),
    };
    setAllAnnouncements((prev) => [...prev, announcement]);
  };

  const value: AppDataContextValue = {
    subjects: mockSubjects,
    classSchedule,
    tests: combinedTests,
    announcements,
    announcementsForParent,
    assignments,
    attendanceRecords: mockAttendanceRecords,
    riskSnapshots: [
      {
        studentId: CURRENT_STUDENT_ID,
        studentName: "Amara Silva",
        attendanceRecords: mockAttendanceRecords,
        assignments,
        quizScores: Object.values(mockQuizAttempts).map((a) => ({
          score: a.score,
          outOf: a.outOf,
          submittedAt: a.submittedAt,
        })),
      },
    ],
    realStudents: [],
    teacherAssignmentResults: assignments.map((a) => ({
      assignmentId: a.id,
      title: a.title,
      subjectLabel: subjectMap.get(a.subjectId)?.name ?? "Class",
      dueDate: a.dueDate,
      assignedCount: 1,
      submissions: [
        {
          studentId: CURRENT_STUDENT_ID,
          studentName: "Amara Silva",
          status: a.status,
          submittedAt: a.submission?.submittedAt,
          submission: a.submission,
          review: a.review,
        },
      ],
    })),
    quizzes,
    teacherQuizResults,
    teacherExamResults,
    getSubject: (id: string) => subjectMap.get(id),
    setAssignmentStatus,
    cycleAssignmentStatus,
    submitAssignmentWork,
    clearAssignmentSubmission,
    addAssignment,
    addAnnouncement,
    markAttendance: () => {
      // Mock mode's Take Attendance tool keeps its own self-contained demo log (see TeacherHome).
    },
    addQuiz,
    submitQuizAnswers,
    addExam,
    setExamGrade,
    updateQuizWeight,
    updateExamWeight,
    setQuizWeightOverride,
    setExamWeightOverride,
    gradingDefaults: mockGradingDefaults,
    setGradingDefaults,
    sectionsFeatureEnabled: false,
    gradebookFeatureEnabled: false,
    gradebookStudentOverridesEnabled: false,
    sections: [],
    sectionPeriods: [],
    addSection: async () => {
      throw new Error("Sections aren't available in demo mode");
    },
    removeSection: () => {},
    subjectCatalog: [],
    addSubjectCatalogEntry: async () => {
      throw new Error("Subjects aren't available in demo mode");
    },
    removeSubjectCatalogEntry: () => {},
    assignTeacherSubject: async () => {
      throw new Error("Subjects aren't available in demo mode");
    },
    classes: [],
    myTeacherClasses: [],
    myEnrolledClasses: [],
    classRoster: () => [],
    createClass: async () => {
      throw new Error("Classes aren't available in demo mode");
    },
    deleteClass: () => {},
    enrollStudentInClass: () => {},
    unenrollStudentFromClass: () => {},
    addSectionPeriod: () => {},
    removeSectionPeriod: () => {},
    sectionStudentRoster: [],
    assignStudentToSection: async () => {
      throw new Error("Sections aren't available in demo mode");
    },
    feesFeatureEnabled: false,
    feesItemizedEnabled: false,
    feesGradeBasedEnabled: false,
    feesSubjectBasedEnabled: false,
    feePlans: [],
    myFeePlans: [],
    createFeePlan: async () => {
      throw new Error("Fees aren't available in demo mode");
    },
    assignFeePlan: () => {},
    unassignFeePlan: () => {},
    deleteFeePlan: () => {},
    setFeeItemPayment: () => {},
    gradeFeeRates: [],
    subjectFeeRates: [],
    studentFeeRoster: [],
    studentFeeOverviews: [],
    setGradeFeeRate: () => {},
    setSubjectFeeRate: () => {},
    removeSubjectFeeRate: () => {},
    setGradeFeePayment: () => {},
    setSubjectFeePayment: () => {},
    subjectDropGraceDays: 7,
    setSubjectDropGraceDays: () => {},
    subjectFeeEnrollmentFor: () => undefined,
    ensureSubjectFeeEnrollment: () => {},
    dropSubjectFee: async () => {
      throw new Error("Fees aren't available in demo mode");
    },
    reactivateSubjectFee: async () => {
      throw new Error("Fees aren't available in demo mode");
    },
  };

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function AppDataProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  if (isSupabaseConfigured && profile) {
    return <RealAppDataProvider profile={profile}>{children}</RealAppDataProvider>;
  }
  return <MockAppDataProvider>{children}</MockAppDataProvider>;
}

export function useAppData(): AppDataContextValue {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error("useAppData must be used within AppDataProvider");
  return ctx;
}
