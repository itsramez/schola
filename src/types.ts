export type AssignmentStatus = "not_started" | "in_progress" | "completed";

export type AttachmentType = "pdf" | "image" | "video" | "link" | "note";

export interface Attachment {
  id: string;
  type: AttachmentType;
  name: string;
  detail?: string;
  /** present when the file was actually uploaded in-app (vs. seed/demo attachments, which are label-only) */
  dataUrl?: string;
  /** set when the file data was auto-purged by the retention policy to save storage; name/metadata are kept */
  fileRemovedAt?: string;
}

export interface Subject {
  id: string;
  name: string;
  icon: string;
  color: string;
  teacher: string;
  room: string;
}

export type AttendanceStatus = "present" | "absent" | "late";

export interface AttendanceRecord {
  id: string;
  subjectId: string;
  classId?: string;
  date: string;
  status: AttendanceStatus;
  /** Present for a real (Supabase-backed) record — identifies whose attendance this is. */
  studentId?: string;
  studentName?: string;
}

export type SubmissionFileType = "pdf" | "image";
export type SubmissionKind = "file" | "text";

export interface Submission {
  kind: SubmissionKind;
  /** set when kind === "file" */
  fileName?: string;
  fileType?: SubmissionFileType;
  dataUrl?: string;
  /** set when kind === "text" */
  textContent?: string;
  submittedAt: string;
  /** set when the file data was auto-purged by the retention policy to save storage; metadata is kept */
  fileRemovedAt?: string;
}

/** "graded" = teacher scored it and it's final. "resubmit" = teacher sent it back for another attempt. */
export type ReviewStatus = "graded" | "resubmit";

export interface TeacherReview {
  status: ReviewStatus;
  score?: number;
  outOf?: number;
  feedback: string;
  reviewedAt: string;
}

export interface Assignment {
  id: string;
  subjectId: string;
  /** Present for a real (Supabase-backed) assignment scoped to a class. */
  classId?: string;
  title: string;
  chapter?: string;
  exercises?: string;
  dueDate: string;
  status: AssignmentStatus;
  attachments: Attachment[];
  /** Teacher-side toggle: whether students can submit work for this assignment. */
  submissionEnabled: boolean;
  submission?: Submission;
  review?: TeacherReview;
  /** Present for a real (Supabase-backed) assignment — when the teacher posted it, used to notify students. */
  createdAt?: string;
}

export interface ClassPeriod {
  id: string;
  subjectId: string;
  day: number;
  startTime: string;
  endTime: string;
  room: string;
}

/** A homeroom-style grouping an admin pre-builds — students are assigned to one when created. */
export interface ClassSection {
  id: string;
  name: string;
  grade: number | null;
}

/** One row of a section's weekly schedule, admin-authored. */
export interface SectionPeriod extends ClassPeriod {
  sectionId: string;
  /** The class this period belongs to — a student not in its roster won't see it on their own schedule. */
  classId: string | null;
  subjectLabel: string;
  teacherName?: string;
}

/** An admin-managed subject name, independent of any teacher account. */
export interface SubjectCatalogEntry {
  id: string;
  name: string;
}

export type ClassRosterMode = "section" | "manual";

/** A subject taught by one teacher to one roster — the unit assignments/quizzes/etc. are scoped to. */
export interface SchoolClass {
  id: string;
  teacherId: string;
  teacherName: string;
  subjectId: string;
  subjectName: string;
  rosterMode: ClassRosterMode;
  sectionId: string | null;
  sectionName: string | null;
  studentCount: number;
}

export type ExamKind = "quiz" | "midterm" | "final" | "exam";

export interface TestEvent {
  id: string;
  subjectId: string;
  title: string;
  date: string;
  kind?: ExamKind;
  detail?: string;
  /** Present for a real (Supabase-backed) exam — when the teacher scheduled it, used to notify students. */
  createdAt?: string;
  /** How much this counts toward the overall grade — teacher's choice, doesn't need to sum to 100 across items. */
  weightPercent?: number;
  /** The current viewer's own effective weight for this exam — a per-student override if the teacher set one, else weightPercent. */
  myWeightPercent?: number;
  /** The current viewer's own grade for this exam, once the teacher has entered it. */
  myGrade?: { score: number; outOf: number };
}

export type AnnouncementCategory = "general" | "transport" | "event" | "academic" | "closure";

/**
 * Who an announcement was sent to. "class" targets one subject's roster, "students" targets
 * specific student ids, "grade" targets a whole grade level. "parents"/"teachers" announcements
 * are never shown in the student's feed.
 */
export type AnnouncementAudienceType =
  | "school"
  | "grade"
  | "class"
  | "students"
  | "parents"
  | "teachers";

export interface AnnouncementAudience {
  type: AnnouncementAudienceType;
  label: string;
  grade?: number;
  subjectId?: string;
  studentIds?: string[];
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  date: string;
  important: boolean;
  category: AnnouncementCategory;
  audience: AnnouncementAudience;
}

/**
 * "open" = teacher posts and students can reply.
 * "teacher_only" = announcement-only, no student replies.
 * "closed" = frozen by the teacher — no one can post, history stays visible.
 */
export type ChannelMode = "open" | "teacher_only" | "closed";

export type MessageAuthorRole = "teacher" | "student" | "admin";

export interface PollOption {
  id: string;
  text: string;
  votes: number;
}

export interface Poll {
  id: string;
  question: string;
  options: PollOption[];
  votedOptionId?: string;
}

export interface ChatMessage {
  id: string;
  channelId: string;
  authorRole: MessageAuthorRole;
  authorName: string;
  body: string;
  timestamp: string;
  pinned?: boolean;
  attachments?: Attachment[];
  poll?: Poll;
}

export interface ClassChannel {
  id: string;
  subjectId: string;
  section: string;
  mode: ChannelMode;
  /** Present for a real (Supabase-backed) channel — overrides the subjectId lookup for display. */
  real?: {
    teacherId: string;
    teacherName: string;
    label: string;
    color: string;
    icon: string;
  };
}

export interface DirectMessage {
  id: string;
  conversationId: string;
  senderRole: MessageAuthorRole;
  body: string;
  timestamp: string;
}

/**
 * "student-teacher" = the current student's private thread with a subject teacher.
 * "admin-teacher" = the admin's private thread with a subject teacher.
 * "admin-student" = the admin's private thread with a student (identified by studentId).
 * "real-dm" = a real (Supabase-backed) 1:1 thread between two actual accounts.
 */
export type ConversationKind = "student-teacher" | "admin-teacher" | "admin-student" | "real-dm";

export interface Conversation {
  id: string;
  kind: ConversationKind;
  subjectId?: string;
  studentId?: string;
  dmDisabled: boolean;
  /** Present when kind === "real-dm" — the other real account in this thread. */
  real?: {
    otherUserId: string;
    otherUserName: string;
    otherUserRole: MessageAuthorRole;
    /** Present only for third-party oversight pairs (admin/parent observing a student↔teacher DM they're not part of). */
    observedStudentName?: string;
    /** Present when the other side is a teacher who has set office hours — null/absent means no restriction. */
    officeHours?: { start: string; end: string } | null;
  };
}

export type UserRole = "student" | "teacher" | "admin" | "parent";

export interface TeacherProfile {
  name: string;
  title: string;
  subjectId: string;
  email: string;
}

export interface SectionPeriod {
  day: number;
  startTime: string;
  endTime: string;
  room: string;
}

export interface TeacherClassSection {
  id: string;
  subjectId: string;
  sectionName: string;
  studentCount: number;
  averageGrade: number;
  schedule: { day: number; startTime: string; endTime: string; room: string }[];
}

export interface PendingGradingItem {
  id: string;
  assignmentTitle: string;
  section: string;
  count: number;
}

export interface QuizQuestion {
  id: string;
  text: string;
  options: string[];
  correctIndex: number;
}

export interface QuizAttempt {
  answers: number[];
  score: number;
  outOf: number;
  submittedAt: string;
}

export interface Quiz {
  id: string;
  teacherName: string;
  subjectLabel: string;
  title: string;
  dueDate?: string;
  questions: QuizQuestion[];
  /** The current viewer's own attempt, if a student and they've taken it. */
  myAttempt?: QuizAttempt;
  /** Present for a real (Supabase-backed) quiz — when the teacher posted it, used to notify students. */
  createdAt?: string;
  /** How much this counts toward the overall grade — teacher's choice, doesn't need to sum to 100 across items. */
  weightPercent?: number;
  /** The current viewer's own effective weight for this quiz — a per-student override if the teacher set one, else weightPercent. */
  myWeightPercent?: number;
}

export interface QuizResultRow {
  studentId: string;
  studentName: string;
  score: number;
  outOf: number;
  submittedAt: string;
  /** This student's effective weight for this item — a per-student override if one exists, else the item's own weight. */
  weightPercent?: number;
}

export interface AssignmentSubmissionRow {
  studentId: string;
  studentName: string;
  status: AssignmentStatus;
  submittedAt?: string;
  submission?: Submission;
  review?: TeacherReview;
}

export interface TeacherAssignmentSummary {
  assignmentId: string;
  title: string;
  subjectLabel: string;
  dueDate: string;
  /** How many real students this assignment was sent to (every current student, if not targeted). */
  assignedCount: number;
  submissions: AssignmentSubmissionRow[];
}

export interface TeacherQuizSummary {
  quizId: string;
  classId?: string;
  title: string;
  subjectLabel: string;
  dueDate?: string;
  totalQuestions: number;
  /** How many students this quiz was sent to (its whole class roster, if not further targeted). */
  assignedCount: number;
  results: QuizResultRow[];
  weightPercent?: number;
}

export interface TeacherExamSummary {
  examId: string;
  classId?: string;
  title: string;
  subjectLabel: string;
  kind: ExamKind;
  date: string;
  weightPercent?: number;
  /** How many students this exam applies to (its whole class roster, if not further targeted). */
  assignedCount: number;
  grades: QuizResultRow[];
}

export interface UnansweredQuestion {
  id: string;
  studentName: string;
  section: string;
  question: string;
  askedAt: string;
}

export interface AdminProfile {
  name: string;
  title: string;
  email: string;
}

/** Platform-wide figures — illustrative mock stats, not derived from the single demo student's data. */
export interface SchoolStats {
  studentCount: number;
  teacherCount: number;
  classCount: number;
  weeklyEngagementPct: number;
}

export interface StudentDirectoryEntry {
  id: string;
  name: string;
  grade: number;
  section: string;
  sectionId: string | null;
  guardianName: string;
}

export interface ParentDirectoryEntry {
  id: string;
  name: string;
  studentName: string;
  email: string;
}

export interface TeacherDirectoryEntry {
  id: string;
  name: string;
  subjectName: string;
  email: string;
}

export interface StudentProfileStats {
  attendanceRate: number;
  assignmentsCompleted: number;
  assignmentsTotal: number;
  /** false for demo roster entries whose day-by-day records aren't modeled — the numbers are illustrative. */
  isRealData: boolean;
}

export interface ParentProfile {
  name: string;
  title: string;
  email: string;
  phone: string;
  studentId: string;
  studentName: string;
  relationship: string;
}

export type FeeKind = "itemized" | "installments";
export type FeePaymentStatus = "unpaid" | "partial" | "paid";

export interface FeePlanItem {
  id: string;
  label: string;
  amount: number;
  dueDate?: string;
}

export interface StudentFeeItemView extends FeePlanItem {
  status: FeePaymentStatus;
  paidAmount: number;
  paidAt?: string;
}

export interface StudentFeePlanView {
  planId: string;
  title: string;
  kind: FeeKind;
  items: StudentFeeItemView[];
  totalDue: number;
  totalPaid: number;
  balance: number;
}

export interface FeePlanAssignmentRow {
  studentId: string;
  studentName: string;
  totalDue: number;
  totalPaid: number;
  balance: number;
}

export interface FeePlanSummary {
  planId: string;
  title: string;
  kind: FeeKind;
  items: FeePlanItem[];
  assignments: FeePlanAssignmentRow[];
}

export interface GradeFeeRate {
  grade: number;
  amount: number;
}

export interface SubjectFeeRate {
  id: string;
  subjectLabel?: string;
  isGeneral: boolean;
  amount: number;
}

/** Tracks when a student started (and, if applicable, dropped) a priced subject — drives the drop grace-period rule. */
export interface SubjectFeeEnrollment {
  studentId: string;
  subjectLabel: string;
  startedAt: string;
  droppedAt: string | null;
  feeWaived: boolean;
}

/** One real student, with everything the admin's Grade/Subject fee rosters need to show. */
export interface StudentFeeRosterEntry {
  id: string;
  name: string;
  grade: number | null;
  subjectLabels: string[];
}

/** One real student with their current section, for the admin's "add students to this section" picker. */
export interface SectionStudentRosterEntry {
  id: string;
  name: string;
  grade: number | null;
  sectionId: string | null;
}

/** One real student with every fee "plan" that applies to them (assigned plans + grade/subject fees) — for the admin's fee search. */
export interface StudentFeeOverview {
  studentId: string;
  studentName: string;
  plans: StudentFeePlanView[];
}
