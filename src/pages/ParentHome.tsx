import { Link } from "react-router-dom";
import { ArrowRight, Award, CalendarCheck, ClipboardList, Megaphone, MessageSquare } from "lucide-react";
import { useAppData } from "../store/AppDataContext";
import { parentProfile } from "../data/mockData";
import { getSubjectIcon } from "../subjectIcons";
import { getGreeting, formatDueLabel, formatFullDate, daysUntil } from "../dateUtils";
import RiskAlerts from "../components/RiskAlerts";
import { useAuth } from "../store/AuthContext";
import { isSupabaseConfigured } from "../lib/supabaseClient";

export default function ParentHome() {
  const { classSchedule, assignments, tests, announcementsForParent, attendanceRecords, getSubject, riskSnapshots } =
    useAppData();
  const { profile } = useAuth();
  const isReal = isSupabaseConfigured && profile?.role === "parent";
  const parentName = isReal ? profile!.name : parentProfile.name;
  const childName = isReal ? riskSnapshots[0]?.studentName ?? "your child" : parentProfile.studentName;

  const attendanceRate =
    attendanceRecords.length === 0
      ? 100
      : Math.round(
          (attendanceRecords.filter((r) => r.status !== "absent").length / attendanceRecords.length) * 1000,
        ) / 10;

  const completed = assignments.filter((a) => a.status === "completed").length;
  const completionRate = assignments.length === 0 ? 0 : Math.round((completed / assignments.length) * 100);

  const todayIndex = new Date().getDay();
  const todaysClasses = classSchedule
    .filter((c) => c.day === todayIndex)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  const upcomingHomework = assignments
    .filter((a) => a.status !== "completed" && daysUntil(a.dueDate) >= 0)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .slice(0, 4);

  const recentGrades = assignments
    .filter((a) => a.review?.status === "graded")
    .sort((a, b) => b.review!.reviewedAt.localeCompare(a.review!.reviewedAt))
    .slice(0, 4);

  const upcomingTests = tests.filter((t) => daysUntil(t.date) >= 0 && daysUntil(t.date) <= 7);

  const importantAnnouncements = announcementsForParent.filter((a) => a.important).slice(0, 3);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl md:text-3xl font-bold text-navy">
          {getGreeting()}, {parentName.split(" ")[0]} 👋
        </h1>
        <p className="text-slate-500 mt-1">Here's how {childName.split(" ")[0]} is doing.</p>
      </header>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-3 md:gap-4">
        <div className="rounded-xl bg-white border border-slate-200 p-4">
          <div className="h-1.5 w-8 rounded-full bg-mint mb-3" />
          <p className="text-2xl font-bold text-navy">{attendanceRate}%</p>
          <p className="text-xs text-slate-500 mt-0.5">Attendance</p>
        </div>
        <div className="rounded-xl bg-white border border-slate-200 p-4">
          <div className="h-1.5 w-8 rounded-full bg-blue mb-3" />
          <p className="text-2xl font-bold text-navy">{completionRate}%</p>
          <p className="text-xs text-slate-500 mt-0.5">Homework done</p>
        </div>
        <div className="rounded-xl bg-white border border-slate-200 p-4">
          <div className="h-1.5 w-8 rounded-full bg-amber-500 mb-3" />
          <p className="text-2xl font-bold text-navy">{upcomingTests.length}</p>
          <p className="text-xs text-slate-500 mt-0.5">Tests this week</p>
        </div>
      </div>

      {/* Alerts */}
      <section>
        <h2 className="font-bold text-lg text-navy mb-3">Alerts</h2>
        <RiskAlerts />
      </section>

      {/* Today's schedule */}
      <section>
        <div className="flex items-center gap-2 text-navy mb-3">
          <CalendarCheck className="h-5 w-5" />
          <h2 className="font-bold text-lg">Today's Schedule</h2>
        </div>
        {todaysClasses.length === 0 ? (
          <EmptyState text="No classes scheduled today." />
        ) : (
          <div className="grid gap-2.5 sm:grid-cols-2">
            {todaysClasses.map((c) => {
              const subject = getSubject(c.subjectId);
              if (!subject) return null;
              const Icon = getSubjectIcon(subject.icon);
              return (
                <div
                  key={c.id}
                  className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3"
                >
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                    style={{ backgroundColor: `${subject.color}1A`, color: subject.color }}
                  >
                    <Icon className="h-4.5 w-4.5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{subject.name}</p>
                    <p className="text-xs text-slate-400">
                      {c.startTime}–{c.endTime}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Homework due */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-navy">
            <ClipboardList className="h-5 w-5" />
            <h2 className="font-bold text-lg">Upcoming Homework</h2>
          </div>
        </div>
        {upcomingHomework.length === 0 ? (
          <EmptyState text="Nothing due soon — all caught up!" />
        ) : (
          <div className="space-y-2">
            {upcomingHomework.map((a) => {
              const subject = getSubject(a.subjectId);
              return (
                <div
                  key={a.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3.5"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-semibold" style={{ color: subject?.color }}>
                      {subject?.name}
                    </p>
                    <p className="font-medium text-slate-800 truncate">{a.title}</p>
                  </div>
                  <span className="shrink-0 text-xs font-semibold text-slate-400">
                    Due {formatDueLabel(a.dueDate)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Recent grades */}
      <section>
        <div className="flex items-center gap-2 text-navy mb-3">
          <Award className="h-5 w-5" />
          <h2 className="font-bold text-lg">Recent Grades</h2>
        </div>
        {recentGrades.length === 0 ? (
          <EmptyState text="No grades posted yet." />
        ) : (
          <div className="space-y-2">
            {recentGrades.map((a) => {
              const subject = getSubject(a.subjectId);
              const review = a.review!;
              return (
                <div key={a.id} className="rounded-xl border border-slate-200 bg-white p-3.5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold" style={{ color: subject?.color }}>
                        {subject?.name}
                      </p>
                      <p className="font-medium text-slate-800 truncate">{a.title}</p>
                    </div>
                    {review.score !== undefined && (
                      <span className="shrink-0 rounded-full bg-mint/10 text-mint text-xs font-bold px-2.5 py-1">
                        {review.score}/{review.outOf}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-1.5">{review.feedback}</p>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Announcements */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-navy">
            <Megaphone className="h-5 w-5" />
            <h2 className="font-bold text-lg">Important Announcements</h2>
          </div>
          <Link
            to="/announcements"
            className="flex items-center gap-1 text-sm font-medium text-blue hover:underline"
          >
            View all <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        {importantAnnouncements.length === 0 ? (
          <EmptyState text="No important announcements right now." />
        ) : (
          <div className="space-y-2.5">
            {importantAnnouncements.map((a) => (
              <div key={a.id} className="rounded-xl border border-navy/10 bg-navy/5 p-3.5">
                <p className="font-semibold text-navy">{a.title}</p>
                <p className="text-sm text-slate-600 mt-0.5">{a.body}</p>
                <p className="text-xs text-slate-400 mt-1.5">
                  {a.audience.label} · {formatFullDate(a.date)}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Contact teachers */}
      <section>
        <Link
          to="/messages"
          className="flex items-center gap-3 rounded-xl border border-dashed border-blue/40 bg-blue/5 p-4 hover:bg-blue/10"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue/10 text-blue">
            <MessageSquare className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-slate-800">View Family Messages</p>
            <p className="text-xs text-slate-500">
              See {childName.split(" ")[0]}'s class chats and teacher conversations.
            </p>
          </div>
          <ArrowRight className="h-4 w-4 text-blue shrink-0" />
        </Link>
      </section>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-400">
      {text}
    </div>
  );
}
