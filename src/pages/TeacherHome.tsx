import { useState } from "react";
import type { FormEvent, ReactNode } from "react";
import {
  CheckCircle2,
  CheckSquare,
  ClipboardList,
  Clock,
  FileQuestion,
  LineChart,
  Megaphone,
  MessageSquare,
  Save,
  XCircle,
} from "lucide-react";
import { generateSectionRoster, teacherProfile, teacherSections } from "../data/mockData";
import { useAppData, type NewAnnouncementInput } from "../store/AppDataContext";
import { useMessaging } from "../store/MessagingContext";
import Modal from "../components/Modal";
import RiskAlerts from "../components/RiskAlerts";
import LauncherTile from "../components/LauncherTile";
import { getGreeting, formatFullDate, toIsoDate } from "../dateUtils";
import { useAuth } from "../store/AuthContext";
import { isSupabaseConfigured } from "../lib/supabaseClient";
import type { AnnouncementAudienceType, AnnouncementCategory, AttendanceStatus } from "../types";

/** Resolves to the real signed-in teacher's own name/subject when Supabase is configured, else the demo teacher. */
function useEffectiveTeacher() {
  const { profile } = useAuth();
  const isReal = isSupabaseConfigured && profile?.role === "teacher";
  return {
    isReal,
    name: isReal ? profile!.name : teacherProfile.name,
    subjectName: isReal ? profile!.subject_name || "your class" : "Science",
    classSubjectId: isReal ? profile!.id : teacherProfile.subjectId,
  };
}

function todayIso(): string {
  return toIsoDate(new Date());
}

export default function TeacherHome() {
  const [activeModal, setActiveModal] = useState<"announcement" | "attendance" | null>(null);

  const teacher = useEffectiveTeacher();
  const { teacherAssignmentResults, teacherQuizResults, attendanceRecords } = useAppData();
  const { channels, conversations, channelMessages, directMessages, channelLastRead, conversationLastRead } =
    useMessaging();

  const attendanceTakenToday = attendanceRecords.some((r) => r.date === todayIso());

  const unreadMessages =
    channels.reduce((sum, c) => {
      const lastRead = channelLastRead[c.id];
      return (
        sum +
        channelMessages.filter(
          (m) => m.channelId === c.id && m.authorRole !== "teacher" && (!lastRead || m.timestamp > lastRead),
        ).length
      );
    }, 0) +
    conversations.reduce((sum, c) => {
      const lastRead = conversationLastRead[c.id];
      return (
        sum +
        directMessages.filter(
          (m) => m.conversationId === c.id && m.senderRole !== "teacher" && (!lastRead || m.timestamp > lastRead),
        ).length
      );
    }, 0);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl md:text-3xl font-bold text-navy">
          {getGreeting()}, {teacher.name.split(" ")[0]} 👋
        </h1>
        <p className="text-slate-500 mt-1">Here's your overview.</p>
      </header>

      {/* Alerts */}
      <section>
        <h2 className="font-bold text-lg text-navy mb-3">Alerts</h2>
        <RiskAlerts />
      </section>

      {/* Launcher tiles */}
      <section className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <LauncherTile
          to="/teacher-assignments"
          icon={ClipboardList}
          label="Assignments"
          badge={`${teacherAssignmentResults.length} active`}
        />
        <LauncherTile to="/teacher-quizzes" icon={FileQuestion} label="Testing" badge={`${teacherQuizResults.length} active`} />
        <LauncherTile
          icon={CheckSquare}
          label="Attendance"
          badge={attendanceTakenToday ? "Taken today" : "Not taken today"}
          badgeTone={attendanceTakenToday ? "ok" : "alert"}
          onClick={() => setActiveModal("attendance")}
        />
        <LauncherTile icon={Megaphone} label="Announcement" badge="Share news" onClick={() => setActiveModal("announcement")} />
        <LauncherTile to="/teacher-insights" icon={LineChart} label="Insights" badge="School trends" />
        <LauncherTile
          to="/messages"
          icon={MessageSquare}
          label="Messages"
          badge={unreadMessages === 0 ? "All caught up" : `${unreadMessages} unread`}
          badgeTone={unreadMessages === 0 ? "ok" : "alert"}
        />
      </section>

      <CreateAnnouncementModal open={activeModal === "announcement"} onClose={() => setActiveModal(null)} />
      <TakeAttendanceModal open={activeModal === "attendance"} onClose={() => setActiveModal(null)} />
    </div>
  );
}

const CATEGORY_OPTIONS: AnnouncementCategory[] = ["general", "academic", "event", "transport", "closure"];

function CreateAnnouncementModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { addAnnouncement, realStudents } = useAppData();
  const teacher = useEffectiveTeacher();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [audienceType, setAudienceType] = useState<AnnouncementAudienceType>("school");
  const [category, setCategory] = useState<AnnouncementCategory>("general");
  const [important, setImportant] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const audienceOptions: { type: AnnouncementAudienceType; label: string }[] = [
    { type: "school", label: "Entire School" },
    { type: "grade", label: "Grade 9" },
    { type: "class", label: `My Class — ${teacher.subjectName}` },
    { type: "students", label: teacher.isReal ? "All current students" : "Just Amara Silva" },
  ];

  const reset = () => {
    setTitle("");
    setBody("");
    setAudienceType("school");
    setCategory("general");
    setImportant(false);
    setConfirmed(false);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;
    const audienceOption = audienceOptions.find((o) => o.type === audienceType)!;
    const input: NewAnnouncementInput = {
      title: title.trim(),
      body: body.trim(),
      important,
      category,
      audience:
        audienceType === "grade"
          ? { type: "grade", label: audienceOption.label, grade: 9 }
          : audienceType === "class"
            ? { type: "class", label: audienceOption.label, subjectId: teacher.classSubjectId }
            : audienceType === "students"
              ? {
                  type: "students",
                  label: audienceOption.label,
                  studentIds: teacher.isReal ? realStudents.map((s) => s.id) : ["amara-silva"],
                }
              : { type: "school", label: audienceOption.label },
    };
    addAnnouncement(input);
    setConfirmed(true);
  };

  return (
    <Modal
      open={open}
      onClose={() => {
        onClose();
        reset();
      }}
      title="New Announcement"
    >
      {confirmed ? (
        <div className="flex flex-col items-center text-center py-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-mint/10 text-mint mb-3">
            <Megaphone className="h-6 w-6" />
          </div>
          <p className="font-semibold text-slate-800">Announcement sent</p>
          <p className="text-sm text-slate-500 mt-1">
            It's now live in School News for the audience you selected.
          </p>
          <button
            onClick={() => {
              onClose();
              reset();
            }}
            className="mt-4 rounded-lg bg-blue px-4 py-2 text-sm font-semibold text-white"
          >
            Done
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          <Field label="Title">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="e.g. Lab Safety Reminder"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue"
            />
          </Field>
          <Field label="Message">
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              required
              rows={3}
              placeholder="Write your announcement…"
              className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Send to">
              <select
                value={audienceType}
                onChange={(e) => setAudienceType(e.target.value as AnnouncementAudienceType)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue"
              >
                {audienceOptions.map((o) => (
                  <option key={o.type} value={o.type}>
                    {o.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Category">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as AnnouncementCategory)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue"
              >
                {CATEGORY_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {c.charAt(0).toUpperCase() + c.slice(1)}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={important}
              onChange={(e) => setImportant(e.target.checked)}
              className="rounded border-slate-300"
            />
            Mark as important
          </label>
          <button
            type="submit"
            className="w-full rounded-lg bg-blue px-4 py-2.5 text-sm font-semibold text-white hover:brightness-95"
          >
            Send Announcement
          </button>
        </form>
      )}
    </Modal>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-slate-500 mb-1">{label}</span>
      {children}
    </label>
  );
}

const ATTENDANCE_LOG_KEY = "schola.teacherAttendanceLog.v1";
const ATTENDANCE_STATUS_META: Record<AttendanceStatus, { label: string; icon: typeof CheckCircle2; className: string }> = {
  present: { label: "Present", icon: CheckCircle2, className: "bg-mint/10 text-mint border-mint/30" },
  late: { label: "Late", icon: Clock, className: "bg-amber-50 text-amber-600 border-amber-200" },
  absent: { label: "Absent", icon: XCircle, className: "bg-red-50 text-red-500 border-red-200" },
};

function loadAttendanceLog(): Record<string, Record<string, AttendanceStatus>> {
  try {
    const raw = localStorage.getItem(ATTENDANCE_LOG_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/** Policy: every 3rd "late" (cumulative, any date) auto-converts to "absent" instead. */
const LATE_TO_ABSENT_THRESHOLD = 3;

function autoConvertLate(
  attendanceRecords: { studentId?: string; date: string; status: AttendanceStatus }[],
  studentId: string,
  date: string,
): AttendanceStatus {
  const priorLateCount = attendanceRecords.filter(
    (r) => r.studentId === studentId && r.date !== date && r.status === "late",
  ).length;
  return (priorLateCount + 1) % LATE_TO_ABSENT_THRESHOLD === 0 ? "absent" : "late";
}

function autoConvertLateMock(
  log: Record<string, Record<string, AttendanceStatus>>,
  sectionId: string,
  currentKey: string,
  studentId: string,
): AttendanceStatus {
  const priorLateCount = Object.entries(log)
    .filter(([k]) => k.startsWith(`${sectionId}_`) && k !== currentKey)
    .reduce((count, [, marks]) => count + (marks[studentId] === "late" ? 1 : 0), 0);
  return (priorLateCount + 1) % LATE_TO_ABSENT_THRESHOLD === 0 ? "absent" : "late";
}

function TakeAttendanceModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { realStudents, attendanceRecords, markAttendance, myTeacherClasses, classRoster } = useAppData();
  const teacher = useEffectiveTeacher();
  const [sectionId, setSectionId] = useState(teacherSections[0].id);
  const [classId, setClassId] = useState("");
  const [date, setDate] = useState(() => toIsoDate(new Date()));
  const [log, setLog] = useState<Record<string, Record<string, AttendanceStatus>>>(() => loadAttendanceLog());
  const [pendingMarks, setPendingMarks] = useState<Record<string, AttendanceStatus>>({});
  const [saved, setSaved] = useState(false);

  const section = teacherSections.find((s) => s.id === sectionId)!;
  const selectedClassId = classId || myTeacherClasses[0]?.id || "";
  const selectedClass = myTeacherClasses.find((c) => c.id === selectedClassId);
  const roster = teacher.isReal
    ? selectedClassId
      ? classRoster(selectedClassId)
      : realStudents
    : generateSectionRoster(section.id, section.studentCount);
  const key = `${sectionId}_${date}`;

  const statusFor = (studentId: string): AttendanceStatus => {
    if (teacher.isReal) {
      const existing = attendanceRecords.find(
        (r) => r.studentId === studentId && r.date === date && r.classId === selectedClassId,
      )?.status;
      return pendingMarks[studentId] ?? existing ?? "present";
    }
    return (log[key] ?? {})[studentId] ?? "present";
  };

  const setMark = (studentId: string, status: AttendanceStatus) => {
    setSaved(false);
    if (teacher.isReal) {
      const effective = status === "late" ? autoConvertLate(attendanceRecords, studentId, date) : status;
      setPendingMarks((prev) => ({ ...prev, [studentId]: effective }));
    } else {
      setLog((prev) => {
        const effective = status === "late" ? autoConvertLateMock(prev, sectionId, key, studentId) : status;
        return { ...prev, [key]: { ...(prev[key] ?? {}), [studentId]: effective } };
      });
    }
  };

  const save = () => {
    if (teacher.isReal) {
      roster.forEach((s) => markAttendance(s.id, date, statusFor(s.id), selectedClassId || undefined));
      setPendingMarks({});
    } else {
      try {
        localStorage.setItem(ATTENDANCE_LOG_KEY, JSON.stringify(log));
      } catch {
        // ignore storage errors
      }
    }
    setSaved(true);
  };

  const presentCount = roster.filter((s) => statusFor(s.id) === "present").length;
  const absentCount = roster.filter((s) => statusFor(s.id) === "absent").length;
  const lateCount = roster.filter((s) => statusFor(s.id) === "late").length;

  return (
    <Modal open={open} onClose={onClose} title="Take Attendance">
      {!teacher.isReal && (
        <div className="flex items-center gap-2 mb-3">
          {teacherSections.map((s) => (
            <button
              key={s.id}
              onClick={() => setSectionId(s.id)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                s.id === sectionId ? "bg-navy text-white" : "bg-slate-100 text-slate-600"
              }`}
            >
              {s.sectionName}
            </button>
          ))}
        </div>
      )}
      {teacher.isReal && myTeacherClasses.length > 1 && (
        <Field label="Class">
          <select
            value={selectedClassId}
            onChange={(e) => {
              setClassId(e.target.value);
              setPendingMarks({});
            }}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue mb-3"
          >
            {myTeacherClasses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.subjectName}
                {c.sectionName ? ` — ${c.sectionName}` : ""}
              </option>
            ))}
          </select>
        </Field>
      )}
      <Field label="Date">
        <input
          type="date"
          value={date}
          onChange={(e) => {
            setDate(e.target.value);
            setSaved(false);
          }}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue mb-3"
        />
      </Field>
      <p className="text-xs text-slate-400 mb-3">
        {teacher.isReal ? selectedClass?.subjectName ?? teacher.subjectName : `Science — ${section.sectionName}`} ·{" "}
        {formatFullDate(date)} ·{" "}
        {presentCount} present, {lateCount} late, {absentCount} absent
      </p>
      {roster.length === 0 ? (
        <p className="text-sm text-slate-400 italic mb-3">
          No student accounts yet — ask an admin to create one from Admin → Users.
        </p>
      ) : (
      <div className="space-y-1.5 max-h-72 overflow-y-auto mb-3 pr-1">
        {roster.map((s) => {
          const status = statusFor(s.id);
          return (
            <div key={s.id} className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-50">
              <p className="text-sm text-slate-700">{s.name}</p>
              <div className="flex items-center gap-1 shrink-0">
                {(Object.keys(ATTENDANCE_STATUS_META) as AttendanceStatus[]).map((st) => {
                  const meta = ATTENDANCE_STATUS_META[st];
                  const Icon = meta.icon;
                  const active = status === st;
                  return (
                    <button
                      key={st}
                      onClick={() => setMark(s.id, st)}
                      title={meta.label}
                      className={`flex h-7 w-7 items-center justify-center rounded-full border ${
                        active ? meta.className : "border-slate-200 text-slate-300 hover:text-slate-400"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      )}
      <button
        onClick={save}
        disabled={roster.length === 0}
        className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-blue px-4 py-2.5 text-sm font-semibold text-white hover:brightness-95 disabled:opacity-50"
      >
        {saved ? <CheckCircle2 className="h-4 w-4" /> : <Save className="h-4 w-4" />}
        {saved ? "Saved" : "Save Attendance"}
      </button>
    </Modal>
  );
}
