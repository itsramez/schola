import type {
  AdminProfile,
  Announcement,
  Assignment,
  AttendanceRecord,
  AttendanceStatus,
  ChatMessage,
  ClassChannel,
  ClassPeriod,
  Conversation,
  DirectMessage,
  ParentDirectoryEntry,
  ParentProfile,
  PendingGradingItem,
  SchoolStats,
  StudentDirectoryEntry,
  Subject,
  TeacherClassSection,
  TeacherDirectoryEntry,
  TeacherProfile,
  TestEvent,
  UnansweredQuestion,
} from "../types";

function isoDate(offsetDays: number): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + offsetDays);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isoDateTime(offsetMinutes: number): string {
  const d = new Date();
  d.setSeconds(0, 0);
  d.setMinutes(d.getMinutes() + offsetMinutes);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hours = String(d.getHours()).padStart(2, "0");
  const mins = String(d.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${mins}:00`;
}

// Days follow JS Date.getDay(): 0 = Sunday ... 6 = Saturday
function nextWeekday(target: number): number {
  const today = new Date().getDay();
  let diff = target - today;
  if (diff < 0) diff += 7;
  return diff;
}

export const subjects: Subject[] = [
  {
    id: "math",
    name: "Mathematics",
    icon: "Sigma",
    color: "#2563EB",
    teacher: "Mr. Daniels",
    room: "Room 204",
  },
  {
    id: "science",
    name: "Science",
    icon: "FlaskConical",
    color: "#10B981",
    teacher: "Ms. Ortega",
    room: "Lab 3",
  },
  {
    id: "english",
    name: "English",
    icon: "BookOpen",
    color: "#7C3AED",
    teacher: "Mrs. Callahan",
    room: "Room 112",
  },
  {
    id: "history",
    name: "History",
    icon: "Landmark",
    color: "#F59E0B",
    teacher: "Mr. Osei",
    room: "Room 108",
  },
  {
    id: "cs",
    name: "Computer Science",
    icon: "Code2",
    color: "#0EA5E9",
    teacher: "Ms. Park",
    room: "Room 301",
  },
  {
    id: "art",
    name: "Art",
    icon: "Palette",
    color: "#EC4899",
    teacher: "Mrs. Nilsson",
    room: "Studio 1",
  },
];

export const classSchedule: ClassPeriod[] = [
  { id: "c1", subjectId: "math", day: 1, startTime: "08:00", endTime: "08:50", room: "Room 204" },
  { id: "c2", subjectId: "science", day: 1, startTime: "09:00", endTime: "09:50", room: "Lab 3" },
  { id: "c3", subjectId: "english", day: 1, startTime: "10:10", endTime: "11:00", room: "Room 112" },
  { id: "c4", subjectId: "history", day: 1, startTime: "11:10", endTime: "12:00", room: "Room 108" },

  { id: "c5", subjectId: "cs", day: 2, startTime: "08:00", endTime: "08:50", room: "Room 301" },
  { id: "c6", subjectId: "math", day: 2, startTime: "09:00", endTime: "09:50", room: "Room 204" },
  { id: "c7", subjectId: "art", day: 2, startTime: "10:10", endTime: "11:00", room: "Studio 1" },

  { id: "c8", subjectId: "english", day: 3, startTime: "08:00", endTime: "08:50", room: "Room 112" },
  { id: "c9", subjectId: "science", day: 3, startTime: "09:00", endTime: "09:50", room: "Lab 3" },
  { id: "c10", subjectId: "math", day: 3, startTime: "10:10", endTime: "11:00", room: "Room 204" },
  { id: "c11", subjectId: "history", day: 3, startTime: "11:10", endTime: "12:00", room: "Room 108" },

  { id: "c12", subjectId: "math", day: 4, startTime: "08:00", endTime: "08:50", room: "Room 204" },
  { id: "c13", subjectId: "cs", day: 4, startTime: "09:00", endTime: "09:50", room: "Room 301" },
  { id: "c14", subjectId: "science", day: 4, startTime: "10:10", endTime: "11:00", room: "Lab 3" },

  { id: "c15", subjectId: "art", day: 5, startTime: "08:00", endTime: "08:50", room: "Studio 1" },
  { id: "c16", subjectId: "english", day: 5, startTime: "09:00", endTime: "09:50", room: "Room 112" },
  { id: "c17", subjectId: "history", day: 5, startTime: "10:10", endTime: "11:00", room: "Room 108" },
];

export const initialAssignments: Assignment[] = [
  {
    id: "a1",
    subjectId: "math",
    title: "Linear Equations",
    chapter: "Chapter 5",
    exercises: "Exercises 1–15",
    dueDate: isoDate(nextWeekday(4)),
    status: "not_started",
    attachments: [
      { id: "att1", type: "pdf", name: "Chapter 5 - Linear Equations.pdf" },
      { id: "att2", type: "note", name: "Show all working steps, no calculators." },
    ],
    submissionEnabled: true,
  },
  {
    id: "a2",
    subjectId: "science",
    title: "Lab Report: Photosynthesis",
    chapter: "Unit 3",
    exercises: "Write-up + data table",
    dueDate: isoDate(0),
    status: "in_progress",
    attachments: [
      { id: "att3", type: "image", name: "leaf-sample-diagram.png" },
      { id: "att4", type: "link", name: "khanacademy.org/photosynthesis" },
    ],
    submissionEnabled: true,
  },
  {
    id: "a3",
    subjectId: "english",
    title: "Essay: To Kill a Mockingbird",
    chapter: "Chapters 10–12",
    exercises: "800-word analytical essay",
    dueDate: isoDate(0),
    status: "not_started",
    attachments: [
      { id: "att5", type: "note", name: "Focus on Atticus's moral courage." },
      { id: "att6", type: "video", name: "Essay structure walkthrough.mp4" },
    ],
    submissionEnabled: true,
  },
  {
    id: "a4",
    subjectId: "history",
    title: "Cold War Timeline",
    chapter: "Chapter 8",
    exercises: "Create annotated timeline",
    dueDate: isoDate(2),
    status: "not_started",
    attachments: [{ id: "att7", type: "pdf", name: "Cold War Key Events.pdf" }],
    submissionEnabled: false,
  },
  {
    id: "a5",
    subjectId: "cs",
    title: "Loops & Functions",
    chapter: "Unit 4",
    exercises: "Exercises 1–8 (Python)",
    dueDate: isoDate(1),
    status: "in_progress",
    attachments: [
      { id: "att8", type: "link", name: "replit.com/schola-cs-unit4" },
      { id: "att9", type: "note", name: "Submit .py files, not screenshots." },
    ],
    submissionEnabled: true,
    submission: {
      kind: "file",
      fileName: "unit4-screenshot.png",
      fileType: "image",
      dataUrl:
        "data:image/svg+xml;utf8," +
        encodeURIComponent(
          '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="200" height="200" fill="#e0f2fe"/><text x="100" y="105" font-family="sans-serif" font-size="14" fill="#0ea5e9" text-anchor="middle">Code Screenshot</text></svg>',
        ),
      submittedAt: isoDateTime(-60 * 20),
    },
    review: {
      status: "resubmit",
      feedback: "You submitted a screenshot — please upload your actual .py file instead.",
      reviewedAt: isoDateTime(-60 * 5),
    },
  },
  {
    id: "a6",
    subjectId: "art",
    title: "Still Life Sketch",
    chapter: "Project 2",
    exercises: "Graphite study, A3 paper",
    dueDate: isoDate(-1),
    status: "completed",
    attachments: [{ id: "att10", type: "image", name: "still-life-reference.jpg" }],
    submissionEnabled: true,
    submission: {
      kind: "file",
      fileName: "still-life-sketch-final.jpg",
      fileType: "image",
      dataUrl:
        "data:image/svg+xml;utf8," +
        encodeURIComponent(
          '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="200" height="200" fill="#fce7f3"/><text x="100" y="105" font-family="sans-serif" font-size="16" fill="#ec4899" text-anchor="middle">Sketch Photo</text></svg>',
        ),
      submittedAt: isoDateTime(-24 * 60 - 45),
    },
    review: {
      status: "graded",
      score: 18,
      outOf: 20,
      feedback: "Great shading and proportion. Work on the composition balance next time.",
      reviewedAt: isoDateTime(-24 * 60 * 3),
    },
  },
  {
    id: "a7",
    subjectId: "math",
    title: "Geometry Review",
    chapter: "Chapter 4",
    exercises: "Exercises 1–20",
    dueDate: isoDate(-2),
    status: "completed",
    attachments: [{ id: "att11", type: "pdf", name: "Chapter 4 Review Sheet.pdf" }],
    submissionEnabled: false,
    review: {
      status: "graded",
      score: 45,
      outOf: 50,
      feedback: "Solid work overall — double-check your angle sum proofs on questions 14–16.",
      reviewedAt: isoDateTime(-24 * 60 * 2),
    },
  },
  {
    id: "a8",
    subjectId: "science",
    title: "Cell Structure Worksheet",
    chapter: "Unit 2",
    exercises: "Label diagram + short answers",
    dueDate: isoDate(-3),
    status: "not_started",
    attachments: [{ id: "att12", type: "pdf", name: "Cell Structure Worksheet.pdf" }],
    submissionEnabled: true,
  },
  {
    id: "a9",
    subjectId: "history",
    title: "Reading Response: Chapter 6",
    chapter: "Chapter 6",
    exercises: "One-page written response",
    dueDate: isoDate(-5),
    status: "not_started",
    attachments: [{ id: "att13", type: "pdf", name: "Chapter 6 Reading.pdf" }],
    submissionEnabled: true,
  },
  {
    id: "a10",
    subjectId: "cs",
    title: "Intro to Functions Homework",
    chapter: "Unit 3",
    exercises: "Exercises 1–6",
    dueDate: isoDate(-6),
    status: "not_started",
    attachments: [{ id: "att14", type: "pdf", name: "Functions Homework.pdf" }],
    submissionEnabled: true,
  },
  {
    id: "a11",
    subjectId: "art",
    title: "Color Wheel Painting",
    chapter: "Project 1",
    exercises: "Watercolor, A4 paper",
    dueDate: isoDate(-40),
    status: "completed",
    attachments: [{ id: "att15", type: "pdf", name: "Color Wheel Instructions.pdf" }],
    submissionEnabled: true,
    submission: {
      kind: "file",
      fileName: "color-wheel-final.jpg",
      fileType: "image",
      dataUrl:
        "data:image/svg+xml;utf8," +
        encodeURIComponent(
          '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="200" height="200" fill="#fce7f3"/><text x="100" y="105" font-family="sans-serif" font-size="15" fill="#ec4899" text-anchor="middle">Color Wheel</text></svg>',
        ),
      submittedAt: isoDateTime(-40 * 24 * 60 + 30),
    },
    review: {
      status: "graded",
      score: 19,
      outOf: 20,
      feedback: "Beautiful blending and accurate hues throughout the wheel.",
      reviewedAt: isoDateTime(-38 * 24 * 60),
    },
  },
];

export const tests: TestEvent[] = [
  {
    id: "t1",
    subjectId: "math",
    title: "Unit 5 Test: Linear Equations",
    date: isoDate(4),
    kind: "quiz",
    detail: "Chapter 5",
  },
  {
    id: "t2",
    subjectId: "science",
    title: "Quiz: Photosynthesis & Respiration",
    date: isoDate(2),
    kind: "quiz",
    detail: "Chapter 3",
  },
  {
    id: "t3",
    subjectId: "history",
    title: "Cold War Midterm",
    date: isoDate(9),
    kind: "midterm",
    detail: "Chapters 1–4",
  },
  {
    id: "t4",
    subjectId: "cs",
    title: "Python Fundamentals Final",
    date: isoDate(22),
    kind: "final",
    detail: "Units 1–4",
  },
  {
    id: "t5",
    subjectId: "english",
    title: "Poetry Analysis Quiz",
    date: isoDate(14),
    kind: "quiz",
    detail: "Chapter 6",
  },
];

export const CURRENT_STUDENT_ID = "amara-silva";
export const CURRENT_STUDENT_GRADE = 9;

export const parentProfile: ParentProfile = {
  name: "Robert Silva",
  title: "Robert Silva",
  email: "r.silva@example.com",
  phone: "+1 (555) 044-7712",
  studentId: CURRENT_STUDENT_ID,
  studentName: "Amara Silva",
  relationship: "Parent/Guardian",
};

const SCHOOL_AUDIENCE: Announcement["audience"] = { type: "school", label: "Entire School" };

export const announcements: Announcement[] = [
  {
    id: "an1",
    title: "School will close at 12 PM tomorrow",
    body: "Due to the forecasted storm, school will dismiss early at 12:00 PM tomorrow. Buses will run on the early-dismissal schedule.",
    date: isoDate(0),
    important: true,
    category: "closure",
    audience: SCHOOL_AUDIENCE,
  },
  {
    id: "an2",
    title: "Bus route #4 changed",
    body: "Route #4 now stops on Elm Street instead of Maple Ave, effective this week. Check the updated map at the front office.",
    date: isoDate(-1),
    important: true,
    category: "transport",
    audience: SCHOOL_AUDIENCE,
  },
  {
    id: "an3",
    title: "Sports Day — September 15",
    body: "Join us for field events, relays, and the annual staff-vs-seniors tug of war. Wear your house colors!",
    date: isoDate(-3),
    important: false,
    category: "event",
    audience: SCHOOL_AUDIENCE,
  },
  {
    id: "an4",
    title: "Library week starts Monday",
    body: "Drop by for the used book swap, a genre scavenger hunt, and extended after-school hours all week.",
    date: isoDate(-4),
    important: false,
    category: "academic",
    audience: SCHOOL_AUDIENCE,
  },
  {
    id: "an5",
    title: "Early Dismissal Friday",
    body: "School will end at 1:00 PM this Friday for staff development.",
    date: isoDate(-2),
    important: true,
    category: "closure",
    audience: SCHOOL_AUDIENCE,
  },
  {
    id: "an6",
    title: "Science Fair Sign-ups Open",
    body: "Sign up with Ms. Ortega by next Monday to reserve your project table.",
    date: isoDate(-5),
    important: false,
    category: "academic",
    audience: { type: "grade", label: "Grade 9", grade: 9 },
  },
  {
    id: "an7",
    title: "Picture Day Rescheduled",
    body: "Picture day has moved to next Wednesday due to the assembly schedule.",
    date: isoDate(-6),
    important: true,
    category: "general",
    audience: SCHOOL_AUDIENCE,
  },
  {
    id: "an8",
    title: "Math contest team tryouts",
    body: "Tryouts for the regional math contest team are after school Thursday in Room 204. Open to all Mathematics students.",
    date: isoDate(-2),
    important: false,
    category: "academic",
    audience: { type: "class", label: "Mathematics — Section A", subjectId: "math" },
  },
  {
    id: "an9",
    title: "You've been selected for the Math Olympiad team!",
    body: "Congratulations — Mr. Daniels selected you to represent Schola Academy at the regional Math Olympiad next month.",
    date: isoDate(-1),
    important: true,
    category: "academic",
    audience: { type: "students", label: "Selected Students", studentIds: [CURRENT_STUDENT_ID] },
  },
  {
    id: "an10",
    title: "Congratulations to the debate team finalists",
    body: "Well done to Omar K. and Layla K. for advancing to the regional debate finals!",
    date: isoDate(-3),
    important: false,
    category: "event",
    audience: { type: "students", label: "Debate Team", studentIds: ["omar-k", "layla-k"] },
  },
  {
    id: "an11",
    title: "Staff PD day rescheduled",
    body: "The professional development half-day for staff has moved to next Friday.",
    date: isoDate(-1),
    important: false,
    category: "general",
    audience: { type: "teachers", label: "Teachers" },
  },
  {
    id: "an12",
    title: "Parent-teacher conference sign-ups open",
    body: "Sign-up slots for fall parent-teacher conferences are now open on the parent portal.",
    date: isoDate(-2),
    important: false,
    category: "general",
    audience: { type: "parents", label: "Parents" },
  },
];

// --- Messaging: class channels + private messaging ---

export const communicationHours = { start: "07:30", end: "18:00" };

export const classChannels: ClassChannel[] = [
  { id: "ch-math", subjectId: "math", section: "Section A", mode: "open" },
  { id: "ch-science", subjectId: "science", section: "Section A", mode: "open" },
  { id: "ch-english", subjectId: "english", section: "Section B", mode: "teacher_only" },
  { id: "ch-history", subjectId: "history", section: "Section A", mode: "open" },
  { id: "ch-cs", subjectId: "cs", section: "Section A", mode: "open" },
  { id: "ch-art", subjectId: "art", section: "Section C", mode: "closed" },
];

export const initialChannelMessages: ChatMessage[] = [
  {
    id: "cm1",
    channelId: "ch-math",
    authorRole: "teacher",
    authorName: "Mr. Daniels",
    body: "Tomorrow's quiz will cover Chapters 3 & 4.",
    timestamp: isoDateTime(-24 * 60),
    pinned: true,
  },
  {
    id: "cm2",
    channelId: "ch-math",
    authorRole: "student",
    authorName: "Priya N.",
    body: "Does that include the word problems from Chapter 4?",
    timestamp: isoDateTime(-24 * 60 + 12),
  },
  {
    id: "cm3",
    channelId: "ch-math",
    authorRole: "teacher",
    authorName: "Mr. Daniels",
    body: "Yes — focus on questions 1–10 especially.",
    timestamp: isoDateTime(-24 * 60 + 20),
  },
  {
    id: "cm4",
    channelId: "ch-math",
    authorRole: "teacher",
    authorName: "Mr. Daniels",
    body: "Quick poll — which review session works best for you?",
    timestamp: isoDateTime(-120),
    poll: {
      id: "poll1",
      question: "Which review session works best for you?",
      options: [
        { id: "opt1", text: "Monday lunch", votes: 6 },
        { id: "opt2", text: "Tuesday after school", votes: 9 },
        { id: "opt3", text: "Wednesday morning", votes: 3 },
      ],
    },
  },

  {
    id: "cm5",
    channelId: "ch-science",
    authorRole: "teacher",
    authorName: "Ms. Ortega",
    body: "Lab safety guidelines attached — please read before Thursday's lab.",
    timestamp: isoDateTime(-24 * 60 * 2),
    pinned: true,
    attachments: [{ id: "cma1", type: "pdf", name: "Lab Safety Guidelines.pdf" }],
  },
  {
    id: "cm6",
    channelId: "ch-science",
    authorRole: "student",
    authorName: "Marcus T.",
    body: "Do we need to bring our own goggles?",
    timestamp: isoDateTime(-24 * 60 * 2 + 30),
  },
  {
    id: "cm7",
    channelId: "ch-science",
    authorRole: "teacher",
    authorName: "Ms. Ortega",
    body: "No, the lab provides goggles and aprons for everyone.",
    timestamp: isoDateTime(-24 * 60 * 2 + 45),
  },

  {
    id: "cm8",
    channelId: "ch-english",
    authorRole: "teacher",
    authorName: "Mrs. Callahan",
    body: "Essay drafts are due Friday — please bring a printed copy to class.",
    timestamp: isoDateTime(-24 * 60 * 3),
    pinned: true,
  },
  {
    id: "cm9",
    channelId: "ch-english",
    authorRole: "teacher",
    authorName: "Mrs. Callahan",
    body: "Here's a short video on structuring your thesis statement.",
    timestamp: isoDateTime(-24 * 60 * 2),
    attachments: [{ id: "cma2", type: "video", name: "Thesis structure tips.mp4" }],
  },

  {
    id: "cm10",
    channelId: "ch-history",
    authorRole: "teacher",
    authorName: "Mr. Osei",
    body: "Reminder: bring your annotated timelines to class on Friday.",
    timestamp: isoDateTime(-60 * 6),
  },
  {
    id: "cm11",
    channelId: "ch-history",
    authorRole: "student",
    authorName: "Layla K.",
    body: "Can we work in pairs for the timeline project?",
    timestamp: isoDateTime(-60 * 5),
  },
  {
    id: "cm12",
    channelId: "ch-history",
    authorRole: "teacher",
    authorName: "Mr. Osei",
    body: "Yes, pairs are fine — just list both names on the submission.",
    timestamp: isoDateTime(-60 * 4),
  },

  {
    id: "cm13",
    channelId: "ch-cs",
    authorRole: "teacher",
    authorName: "Ms. Park",
    body: "Here's the Repl.it link for this week's exercises.",
    timestamp: isoDateTime(-60 * 10),
    attachments: [{ id: "cma3", type: "link", name: "replit.com/schola-cs-unit4" }],
  },
  {
    id: "cm14",
    channelId: "ch-cs",
    authorRole: "student",
    authorName: "Ben O.",
    body: "My loop keeps running forever on exercise 3 — any hints?",
    timestamp: isoDateTime(-60 * 3),
  },

  {
    id: "cm15",
    channelId: "ch-art",
    authorRole: "teacher",
    authorName: "Mrs. Nilsson",
    body: "Great work on the still life sketches this week — a few will be displayed in the hallway gallery!",
    timestamp: isoDateTime(-24 * 60 * 4),
    pinned: true,
  },
];

export const conversations: Conversation[] = [
  { id: "conv-math", kind: "student-teacher", subjectId: "math", dmDisabled: false },
  { id: "conv-science", kind: "student-teacher", subjectId: "science", dmDisabled: false },
  { id: "conv-english", kind: "student-teacher", subjectId: "english", dmDisabled: false },
  { id: "conv-history", kind: "student-teacher", subjectId: "history", dmDisabled: true },
  { id: "conv-cs", kind: "student-teacher", subjectId: "cs", dmDisabled: false },

  // Admin <-> teacher, one per subject
  { id: "admin-math", kind: "admin-teacher", subjectId: "math", dmDisabled: false },
  { id: "admin-science", kind: "admin-teacher", subjectId: "science", dmDisabled: false },
  { id: "admin-english", kind: "admin-teacher", subjectId: "english", dmDisabled: false },
  { id: "admin-history", kind: "admin-teacher", subjectId: "history", dmDisabled: false },
  { id: "admin-cs", kind: "admin-teacher", subjectId: "cs", dmDisabled: false },
  { id: "admin-art", kind: "admin-teacher", subjectId: "art", dmDisabled: false },

  // Admin <-> student. conv-admin is Amara's real, bidirectional thread (visible in her own Messages page).
  { id: "conv-admin", kind: "admin-student", studentId: CURRENT_STUDENT_ID, dmDisabled: false },
  { id: "admin-std-marcus", kind: "admin-student", studentId: "std-marcus", dmDisabled: false },
  { id: "admin-std-priya", kind: "admin-student", studentId: "std-priya", dmDisabled: false },
  { id: "admin-std-layla", kind: "admin-student", studentId: "std-layla", dmDisabled: false },
  { id: "admin-std-benj", kind: "admin-student", studentId: "std-benj", dmDisabled: false },
  { id: "admin-std-omar", kind: "admin-student", studentId: "std-omar", dmDisabled: false },
];

export const initialDirectMessages: DirectMessage[] = [
  {
    id: "dm1",
    conversationId: "conv-math",
    senderRole: "student",
    body: "Hi Mr. Daniels, could I get an extension on the linear equations homework? I was at a dentist appointment.",
    timestamp: isoDateTime(-24 * 60),
  },
  {
    id: "dm2",
    conversationId: "conv-math",
    senderRole: "teacher",
    body: "No problem, Amara — you can turn it in by Friday instead.",
    timestamp: isoDateTime(-24 * 60 + 40),
  },
  {
    id: "dm3",
    conversationId: "conv-cs",
    senderRole: "student",
    body: "Is it okay if I use a while loop instead of a for loop for exercise 5?",
    timestamp: isoDateTime(-180),
  },
  {
    id: "dm4",
    conversationId: "conv-cs",
    senderRole: "teacher",
    body: "Yes, either works as long as it produces the correct output.",
    timestamp: isoDateTime(-150),
  },
];

/** Deterministic pseudo-random in [0, 1), stable across reloads without needing persisted state. */
function seededRandom(seed: number): number {
  return Math.abs(Math.sin(seed) * 10000) % 1;
}

function seededStatus(seed: number): AttendanceStatus {
  const r = seededRandom(seed);
  if (r < 0.05) return "absent";
  if (r < 0.12) return "late";
  return "present";
}

/** The 3 most recent school days are forced fully absent, to demo the unexplained-absence-streak alert. */
const FORCED_ABSENCE_OFFSETS = new Set([1, 2, 3]);

function generateAttendance(): AttendanceRecord[] {
  const records: AttendanceRecord[] = [];
  let seed = 1;
  for (let offset = 1; offset <= 24; offset++) {
    const dateStr = isoDate(-offset);
    const weekday = new Date(`${dateStr}T00:00:00`).getDay();
    const seenSubjects = new Set<string>();
    for (const period of classSchedule) {
      if (period.day !== weekday || seenSubjects.has(period.subjectId)) continue;
      seenSubjects.add(period.subjectId);
      records.push({
        id: `att-${dateStr}-${period.subjectId}`,
        subjectId: period.subjectId,
        date: dateStr,
        status: FORCED_ABSENCE_OFFSETS.has(offset) ? "absent" : seededStatus(seed++),
      });
    }
  }
  return records.sort((a, b) => b.date.localeCompare(a.date));
}

export const attendanceRecords: AttendanceRecord[] = generateAttendance();

// --- Teacher persona: Ms. Sara Ortega, who also teaches Amara's Science class ---

export const teacherProfile: TeacherProfile = {
  name: "Sara Ortega",
  title: "Ms. Sara Ortega",
  subjectId: "science",
  email: "sara.ortega@schola.edu",
};

export const teacherSections: TeacherClassSection[] = [
  {
    id: "sec-10a",
    subjectId: "science",
    sectionName: "10A",
    studentCount: 24,
    averageGrade: 87,
    schedule: [
      { day: 1, startTime: "08:00", endTime: "08:50", room: "Lab 3" },
      { day: 5, startTime: "08:00", endTime: "08:50", room: "Lab 3" },
    ],
  },
  {
    id: "sec-10b",
    subjectId: "science",
    sectionName: "10B",
    studentCount: 22,
    averageGrade: 82,
    schedule: [
      { day: 1, startTime: "09:00", endTime: "09:50", room: "Lab 3" },
      { day: 5, startTime: "09:00", endTime: "09:50", room: "Lab 3" },
    ],
  },
  {
    id: "sec-10c",
    subjectId: "science",
    sectionName: "10C",
    studentCount: 23,
    averageGrade: 91,
    schedule: [
      { day: 2, startTime: "09:00", endTime: "09:50", room: "Lab 3" },
      { day: 5, startTime: "10:10", endTime: "11:00", room: "Lab 3" },
    ],
  },
];

export interface RosterStudent {
  id: string;
  name: string;
}

const ROSTER_FIRST_NAMES = [
  "Ava", "Liam", "Maya", "Noah", "Zara", "Ethan", "Nadia", "Lucas", "Ines", "Omar",
  "Grace", "Yusuf", "Chloe", "Adam", "Leah", "Kai", "Fatima", "Theo", "Amina", "Ryan",
  "Sofia", "Elias", "Nora", "Marcus",
];
const ROSTER_LAST_INITIALS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

/** Deterministic per-section roster — stable across reloads, no persisted state needed. */
export function generateSectionRoster(sectionId: string, count: number): RosterStudent[] {
  const seedBase = Array.from(sectionId).reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  const roster: RosterStudent[] = [];
  for (let i = 0; i < count; i++) {
    const nameSeed = seedBase + i * 7;
    const firstName = ROSTER_FIRST_NAMES[Math.floor(seededRandom(nameSeed) * ROSTER_FIRST_NAMES.length)];
    const lastInitial = ROSTER_LAST_INITIALS[Math.floor(seededRandom(nameSeed + 3) * ROSTER_LAST_INITIALS.length)];
    roster.push({ id: `${sectionId}-std-${i}`, name: `${firstName} ${lastInitial}.` });
  }
  return roster;
}

export const pendingGrading: PendingGradingItem[] = [
  { id: "pg1", assignmentTitle: "Lab Report: Cell Division", section: "10A", count: 8 },
  { id: "pg2", assignmentTitle: "Ecosystems Worksheet", section: "10B", count: 6 },
  { id: "pg3", assignmentTitle: "Photosynthesis Quiz Retake", section: "10C", count: 4 },
];

export const unansweredQuestions: UnansweredQuestion[] = [
  {
    id: "uq1",
    studentName: "Marcus T.",
    section: "10A",
    question: "Is the lab report due before or after Friday's quiz?",
    askedAt: isoDateTime(-90),
  },
  {
    id: "uq2",
    studentName: "Priya N.",
    section: "10B",
    question: "Can we redo the ecosystems worksheet for extra credit?",
    askedAt: isoDateTime(-200),
  },
];

// --- School Admin persona: Mr. James Whitfield, Principal ---

export const adminProfile: AdminProfile = {
  name: "James Whitfield",
  title: "Mr. James Whitfield",
  email: "j.whitfield@schola.edu",
};

/** Illustrative platform-wide figures for a mid-size school — not derived from the single demo student. */
export const schoolStats: SchoolStats = {
  studentCount: 1248,
  teacherCount: 86,
  classCount: 42,
  weeklyEngagementPct: 91,
};

export const studentsDirectory: StudentDirectoryEntry[] = [
  { id: CURRENT_STUDENT_ID, name: "Amara Silva", grade: 9, section: "9A", sectionId: null, guardianName: "Robert Silva" },
  { id: "std-marcus", name: "Marcus T.", grade: 10, section: "10A", sectionId: null, guardianName: "Diane Thompson" },
  { id: "std-priya", name: "Priya N.", grade: 10, section: "10B", sectionId: null, guardianName: "Anil Nair" },
  { id: "std-layla", name: "Layla K.", grade: 9, section: "9B", sectionId: null, guardianName: "Farah Khoury" },
  { id: "std-benj", name: "Ben O.", grade: 10, section: "10C", sectionId: null, guardianName: "Grace Osei" },
  { id: "std-omar", name: "Omar K.", grade: 9, section: "9B", sectionId: null, guardianName: "Khalid Karam" },
];

export const parentsDirectory: ParentDirectoryEntry[] = [
  { id: "par-1", name: "Robert Silva", studentName: "Amara Silva", email: "r.silva@example.com" },
  { id: "par-2", name: "Diane Thompson", studentName: "Marcus T.", email: "d.thompson@example.com" },
  { id: "par-3", name: "Anil Nair", studentName: "Priya N.", email: "a.nair@example.com" },
  { id: "par-4", name: "Farah Khoury", studentName: "Layla K.", email: "f.khoury@example.com" },
];

export const initialTeachersDirectory: TeacherDirectoryEntry[] = subjects.map((s) => ({
  id: `tch-${s.id}`,
  name: s.teacher,
  subjectName: s.name,
  email: `${s.teacher.split(" ").pop()?.toLowerCase()}@schola.edu`,
}));

/**
 * Deterministic per-student summary for admin's student-profile view. Amara Silva has real
 * day-by-day records elsewhere in the app; every other roster entry gets a stable, seeded
 * illustrative summary instead of pretending we track their daily attendance/homework.
 */
export function getStudentProfileStats(studentId: string): { attendanceRate: number; assignmentsCompleted: number; assignmentsTotal: number } {
  const seed = Array.from(studentId).reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  const attendanceRate = Math.round((88 + seededRandom(seed) * 10) * 10) / 10;
  const assignmentsTotal = 6 + Math.floor(seededRandom(seed + 1) * 5);
  const assignmentsCompleted = Math.max(1, Math.round(assignmentsTotal * (0.6 + seededRandom(seed + 2) * 0.35)));
  return { attendanceRate, assignmentsCompleted, assignmentsTotal };
}

/** Illustrative per-section attendance rate for admin oversight — not derived from real day-by-day records. */
export function getSectionAttendanceRate(sectionId: string): number {
  const seed = Array.from(sectionId).reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  return Math.round((85 + seededRandom(seed + 11) * 12) * 10) / 10;
}
