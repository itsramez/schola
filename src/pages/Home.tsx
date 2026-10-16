import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  ArrowRight,
  BookOpenCheck,
  CalendarClock,
  CheckSquare,
  ChevronRight,
  ClipboardList,
  Megaphone,
  RotateCcw,
  Square,
} from "lucide-react";
import { useAppData } from "../store/AppDataContext";
import { useRole } from "../store/RoleContext";
import { getSubjectIcon } from "../subjectIcons";
import { formatFullDate, isToday, daysUntil } from "../dateUtils";
import StatusControl from "../components/StatusControl";
import TeacherHome from "./TeacherHome";
import AdminHome from "./AdminHome";
import ParentHome from "./ParentHome";

export default function Home() {
  const { role } = useRole();
  const { classSchedule, assignments, tests, announcements, getSubject, setAssignmentStatus } =
    useAppData();

  if (role === "teacher") return <TeacherHome />;
  if (role === "admin") return <AdminHome />;
  if (role === "parent") return <ParentHome />;

  const todayIndex = new Date().getDay();
  const todaysClasses = classSchedule
    .filter((c) => c.day === todayIndex)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  const homeworkDueToday = assignments.filter((a) => isToday(a.dueDate) && a.status !== "completed");

  const upcomingTests = tests
    .filter((t) => daysUntil(t.date) >= 0 && daysUntil(t.date) <= 14)
    .sort((a, b) => daysUntil(a.date) - daysUntil(b.date));

  const importantAnnouncements = announcements.filter((a) => a.important).slice(0, 2);

  const pendingTasks = assignments
    .filter((a) => a.status !== "completed")
    .sort((a, b) => daysUntil(a.dueDate) - daysUntil(b.dueDate))
    .slice(0, 6);

  const needsAttention = assignments.filter((a) => a.review?.status === "resubmit");

  return (
    <div className="space-y-8">
      <header>
        <p className="text-sm font-semibold text-blue">{formatFullDate(new Date().toISOString().slice(0, 10))}</p>
        <h1 className="text-2xl md:text-3xl font-bold text-navy mt-1">Good to see you, Amara 👋</h1>
        <p className="text-slate-500 mt-1">Here's what's happening today.</p>
      </header>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-3 md:gap-4">
        <StatCard label="Classes today" value={todaysClasses.length} color="bg-blue" />
        <StatCard label="Due today" value={homeworkDueToday.length} color="bg-red-500" />
        <StatCard label="Tests soon" value={upcomingTests.length} color="bg-mint" />
      </div>

      {/* Needs attention: resubmission requests */}
      {needsAttention.length > 0 && (
        <Section
          icon={<RotateCcw className="h-5 w-5" />}
          title="Needs Your Attention"
          action={{ to: "/agenda", label: "Open agenda" }}
        >
          <div className="space-y-2.5">
            {needsAttention.map((a) => {
              const subject = getSubject(a.subjectId);
              return (
                <Link
                  key={a.id}
                  to="/agenda"
                  className="flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3.5 hover:bg-amber-100/70 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-semibold" style={{ color: subject?.color }}>
                      {subject?.name}
                    </p>
                    <p className="font-medium text-slate-800 truncate">{a.title}</p>
                    <p className="text-xs text-amber-700 mt-0.5 truncate">{a.review?.feedback}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-amber-500 px-2.5 py-1 text-xs font-semibold text-white">
                    Resubmit
                  </span>
                </Link>
              );
            })}
          </div>
        </Section>
      )}

      {/* Classes today */}
      <Section
        icon={<BookOpenCheck className="h-5 w-5" />}
        title="Classes Today"
        action={{ to: "/classes", label: "View all" }}
      >
        {todaysClasses.length === 0 ? (
          <EmptyState text="No classes scheduled today. Enjoy the break!" />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {todaysClasses.map((c) => {
              const subject = getSubject(c.subjectId);
              if (!subject) return null;
              const Icon = getSubjectIcon(subject.icon);
              return (
                <div
                  key={c.id}
                  className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3.5"
                >
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                    style={{ backgroundColor: `${subject.color}1A`, color: subject.color }}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-800 truncate">{subject.name}</p>
                    <p className="text-xs text-slate-500">
                      {c.startTime}–{c.endTime}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Section>

      {/* Homework due today */}
      <Section
        icon={<ClipboardList className="h-5 w-5" />}
        title="Homework Due Today"
        action={{ to: "/agenda", label: "Open agenda" }}
      >
        {homeworkDueToday.length === 0 ? (
          <EmptyState text="Nothing due today. You're all caught up!" />
        ) : (
          <div className="space-y-2.5">
            {homeworkDueToday.map((hw) => {
              const subject = getSubject(hw.subjectId);
              return (
                <div
                  key={hw.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3.5"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-semibold" style={{ color: subject?.color }}>
                      {subject?.name}
                    </p>
                    <p className="font-medium text-slate-800 truncate">{hw.title}</p>
                  </div>
                  <StatusControl status={hw.status} onChange={(s) => setAssignmentStatus(hw.id, s)} />
                </div>
              );
            })}
          </div>
        )}
      </Section>

      {/* Upcoming tests */}
      <Section
        icon={<AlertCircle className="h-5 w-5" />}
        title="Upcoming Tests"
        action={{ to: "/calendar", label: "Exam calendar" }}
      >
        {upcomingTests.length === 0 ? (
          <EmptyState text="No tests scheduled in the next two weeks." />
        ) : (
          <div className="space-y-2.5">
            {upcomingTests.map((t) => {
              const subject = getSubject(t.subjectId);
              const d = daysUntil(t.date);
              return (
                <div
                  key={t.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3.5"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-semibold" style={{ color: subject?.color }}>
                      {subject?.name}
                    </p>
                    <p className="font-medium text-slate-800 truncate">{t.title}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-amber-500 px-2.5 py-1 text-xs font-semibold text-white">
                    {d === 0 ? "Today" : d === 1 ? "Tomorrow" : `In ${d} days`}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </Section>

      {/* Important announcements */}
      <Section
        icon={<Megaphone className="h-5 w-5" />}
        title="Important Announcements"
        action={{ to: "/announcements", label: "View all" }}
      >
        {importantAnnouncements.length === 0 ? (
          <EmptyState text="No important announcements right now." />
        ) : (
          <div className="space-y-2.5">
            {importantAnnouncements.map((a) => (
              <div key={a.id} className="rounded-xl border border-navy/10 bg-navy/5 p-3.5">
                <p className="font-semibold text-navy">{a.title}</p>
                <p className="text-sm text-slate-600 mt-0.5">{a.body}</p>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Schedule timeline */}
      <Section icon={<CalendarClock className="h-5 w-5" />} title="Today's Schedule">
        {todaysClasses.length === 0 ? (
          <EmptyState text="Nothing on the timetable today." />
        ) : (
          <ol className="relative border-l-2 border-slate-200 pl-5 space-y-5 ml-1.5">
            {todaysClasses.map((c) => {
              const subject = getSubject(c.subjectId);
              if (!subject) return null;
              return (
                <li key={c.id} className="relative">
                  <span
                    className="absolute -left-[27px] top-1 h-3 w-3 rounded-full border-2 border-white"
                    style={{ backgroundColor: subject.color }}
                  />
                  <p className="text-xs font-semibold text-slate-400">
                    {c.startTime} – {c.endTime}
                  </p>
                  <p className="font-medium text-slate-800">{subject.name}</p>
                </li>
              );
            })}
          </ol>
        )}
      </Section>

      {/* Tasks to complete */}
      <Section icon={<CheckSquare className="h-5 w-5" />} title="Tasks to Complete">
        {pendingTasks.length === 0 ? (
          <EmptyState text="Nothing pending — great job staying on top of things!" />
        ) : (
          <div className="space-y-2">
            {pendingTasks.map((task) => {
              const subject = getSubject(task.subjectId);
              return (
                <div
                  key={task.id}
                  className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white pr-1 hover:border-mint/50 transition-colors"
                >
                  <button
                    onClick={() => setAssignmentStatus(task.id, "completed")}
                    title="Mark as completed"
                    className="flex h-11 w-11 shrink-0 items-center justify-center text-slate-300 hover:text-mint"
                  >
                    <Square className="h-5 w-5" />
                  </button>
                  <Link to="/assignments" className="flex min-w-0 flex-1 items-center gap-3 py-3 hover:bg-mint/5 rounded-lg">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-800 truncate">{task.title}</p>
                      <p className="text-xs text-slate-400">
                        {subject?.name} · Due {formatFullDate(task.dueDate)}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-300 shrink-0" />
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </Section>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-xl bg-white border border-slate-200 p-4">
      <div className={`h-1.5 w-8 rounded-full ${color} mb-3`} />
      <p className="text-2xl font-bold text-navy">{value}</p>
      <p className="text-xs text-slate-500 mt-0.5">{label}</p>
    </div>
  );
}

function Section({
  icon,
  title,
  action,
  children,
}: {
  icon: ReactNode;
  title: string;
  action?: { to: string; label: string };
  children: ReactNode;
}) {
  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-navy">
          {icon}
          <h2 className="font-bold text-lg">{title}</h2>
        </div>
        {action && (
          <Link
            to={action.to}
            className="flex items-center gap-1 text-sm font-medium text-blue hover:underline"
          >
            {action.label} <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-400">
      {text}
    </div>
  );
}
