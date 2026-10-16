import { useState } from "react";
import { Calendar } from "lucide-react";
import { useAppData } from "../store/AppDataContext";
import { isSupabaseConfigured } from "../lib/supabaseClient";
import { daysUntil, formatFullDate } from "../dateUtils";
import { DirectoryNote } from "./admin/adminShared";

type Tab = "calendar" | "exams";

export default function AdminCalendar() {
  const [tab, setTab] = useState<Tab>("calendar");

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-2 text-navy">
        <Calendar className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Calendar</h1>
      </header>

      <div className="flex gap-2">
        {(
          [
            { key: "calendar", label: "Master Calendar" },
            { key: "exams", label: "Exams" },
          ] as const
        ).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              tab === t.key ? "bg-navy text-white" : "bg-white text-slate-500 border border-slate-200 hover:border-navy/30"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        {tab === "calendar" ? <MasterCalendarSection /> : <ExamsSection />}
      </div>
    </div>
  );
}

function ExamsSection() {
  const { tests, getSubject } = useAppData();
  const sorted = [...tests].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <>
      <DirectoryNote>
        {isSupabaseConfigured
          ? "Upcoming and recent exams scheduled by every teacher, school-wide."
          : "Upcoming and recent exams across Amara's tracked classes."}
      </DirectoryNote>
      {sorted.length === 0 && <p className="text-sm text-slate-400 py-6 text-center">No exams scheduled yet.</p>}
      <div className="space-y-2">
        {sorted.map((t) => {
          const subject = getSubject(t.subjectId);
          const d = daysUntil(t.date);
          const past = d < 0;
          return (
            <div key={t.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 p-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold" style={{ color: subject?.color }}>
                  {subject?.name} · {(t.kind ?? "exam").toUpperCase()}
                </p>
                <p className="text-sm font-medium text-slate-800 truncate">{t.title}</p>
              </div>
              <span className={`shrink-0 text-xs font-semibold ${past ? "text-slate-400" : "text-amber-600"}`}>
                {past ? formatFullDate(t.date) : d === 0 ? "Today" : `In ${d}d`}
              </span>
            </div>
          );
        })}
      </div>
    </>
  );
}

function MasterCalendarSection() {
  const { tests, assignments, announcements, getSubject } = useAppData();

  const events = [
    ...tests.map((t) => ({ id: `t-${t.id}`, date: t.date, label: t.title, kind: "Exam", color: "#F59E0B" })),
    ...assignments
      .filter((a) => a.status !== "completed")
      .map((a) => ({
        id: `a-${a.id}`,
        date: a.dueDate,
        label: a.title,
        kind: "Homework",
        color: getSubject(a.subjectId)?.color ?? "#2563EB",
      })),
    ...announcements
      .filter((an) => an.category === "event")
      .map((an) => ({ id: `an-${an.id}`, date: an.date, label: an.title, kind: "Event", color: "#10B981" })),
  ]
    .filter((e) => daysUntil(e.date) >= -3)
    .sort((a, b) => a.date.localeCompare(b.date));

  return (
    <>
      <DirectoryNote>
        {isSupabaseConfigured
          ? "Real exams, assignment deadlines, and school-wide events across every class."
          : "Combined exams, homework, and events for Amara's tracked classes — a full master calendar across every class is coming soon."}
      </DirectoryNote>
      <div className="space-y-2">
        {events.length === 0 && <p className="text-sm text-slate-400">Nothing on the calendar right now.</p>}
        {events.map((e) => (
          <div key={e.id} className="flex items-center gap-3 rounded-lg border border-slate-100 p-3">
            <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: e.color }} />
            <div className="min-w-0 flex-1">
              <p className="text-sm text-slate-700 truncate">{e.label}</p>
              <p className="text-xs text-slate-400">{e.kind}</p>
            </div>
            <span className="text-xs font-semibold text-slate-400 shrink-0">{formatFullDate(e.date)}</span>
          </div>
        ))}
      </div>
    </>
  );
}
