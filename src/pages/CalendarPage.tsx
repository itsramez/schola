import { useEffect, useMemo, useState } from "react";
import { Bell, BellOff, Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { useAppData } from "../store/AppDataContext";
import { getSubjectIcon } from "../subjectIcons";
import { daysUntil, monthName, relativeDayLabel, toIsoDate } from "../dateUtils";

type CalendarCategory = "class" | "homework" | "exam" | "event" | "announcement";

interface CalendarEvent {
  id: string;
  category: CalendarCategory;
  date: string;
  title: string;
  subjectId?: string;
  time?: string;
  detail?: string;
}

const REMINDER_THRESHOLD_DAYS = 3;
const NOTIFIED_KEY = "schola.examReminders.notified";

const CATEGORY_STYLE: Record<
  CalendarCategory,
  { label: string; emoji: string; dot: string; bg: string; text: string }
> = {
  class: { label: "Classes", emoji: "🟦", dot: "bg-blue-500", bg: "bg-blue-50", text: "text-blue-600" },
  homework: {
    label: "Homework",
    emoji: "🟨",
    dot: "bg-yellow-400",
    bg: "bg-yellow-50",
    text: "text-yellow-700",
  },
  exam: { label: "Exams", emoji: "🟥", dot: "bg-red-500", bg: "bg-red-50", text: "text-red-600" },
  event: { label: "Events", emoji: "🟩", dot: "bg-green-500", bg: "bg-green-50", text: "text-green-600" },
  announcement: {
    label: "School Announcements",
    emoji: "🟪",
    dot: "bg-purple-500",
    bg: "bg-purple-50",
    text: "text-purple-600",
  },
};

const ALL_CATEGORIES = Object.keys(CATEGORY_STYLE) as CalendarCategory[];

function buildMonthGrid(year: number, month: number) {
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();
  const cells: { date: Date; inMonth: boolean }[] = [];

  for (let i = firstWeekday - 1; i >= 0; i--) {
    cells.push({ date: new Date(year, month - 1, daysInPrevMonth - i), inMonth: false });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ date: new Date(year, month, d), inMonth: true });
  }
  let nextDay = 1;
  while (cells.length % 7 !== 0) {
    cells.push({ date: new Date(year, month + 1, nextDay), inMonth: false });
    nextDay++;
  }
  return cells;
}

export default function CalendarPage() {
  const { tests, assignments, announcements, classSchedule, getSubject } = useAppData();
  const now = new Date();
  const todayIso = toIsoDate(now);
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [selectedDate, setSelectedDate] = useState(todayIso);
  const [visibleCategories, setVisibleCategories] = useState<Set<CalendarCategory>>(
    () => new Set(ALL_CATEGORIES),
  );
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(
    typeof Notification === "undefined" ? "unsupported" : Notification.permission,
  );

  const toggleCategory = (cat: CalendarCategory) => {
    setVisibleCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  // Non-recurring events: homework, exams, events, announcements
  const flatEvents: CalendarEvent[] = useMemo(() => {
    const homework: CalendarEvent[] = assignments
      .filter((a) => a.status !== "completed")
      .map((a) => ({
        id: `hw-${a.id}`,
        category: "homework",
        date: a.dueDate,
        title: a.title,
        subjectId: a.subjectId,
        detail: a.chapter,
      }));

    const exams: CalendarEvent[] = tests.map((t) => ({
      id: `exam-${t.id}`,
      category: "exam",
      date: t.date,
      title: t.title,
      subjectId: t.subjectId,
      detail: t.detail,
    }));

    const events: CalendarEvent[] = announcements
      .filter((a) => a.category === "event")
      .map((a) => ({ id: `evt-${a.id}`, category: "event", date: a.date, title: a.title }));

    const schoolAnnouncements: CalendarEvent[] = announcements
      .filter((a) => a.category !== "event")
      .map((a) => ({ id: `an-${a.id}`, category: "announcement", date: a.date, title: a.title }));

    return [...homework, ...exams, ...events, ...schoolAnnouncements];
  }, [assignments, tests, announcements]);

  const classesByWeekday = useMemo(() => {
    const map = new Map<number, CalendarEvent[]>();
    for (const period of classSchedule) {
      const subject = getSubject(period.subjectId);
      const list = map.get(period.day) ?? [];
      list.push({
        id: `class-${period.id}`,
        category: "class",
        date: "",
        title: subject?.name ?? "Class",
        subjectId: period.subjectId,
        time: `${period.startTime}–${period.endTime}`,
      });
      map.set(period.day, list);
    }
    for (const list of map.values()) list.sort((a, b) => (a.time ?? "").localeCompare(b.time ?? ""));
    return map;
  }, [classSchedule, getSubject]);

  const getClassesForDate = (iso: string): CalendarEvent[] => {
    const weekday = new Date(`${iso}T00:00:00`).getDay();
    return classesByWeekday.get(weekday) ?? [];
  };

  const flatEventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const e of flatEvents) {
      const list = map.get(e.date) ?? [];
      list.push(e);
      map.set(e.date, list);
    }
    return map;
  }, [flatEvents]);

  const getEventsForDate = (iso: string): CalendarEvent[] => {
    const classes = visibleCategories.has("class") ? getClassesForDate(iso) : [];
    const rest = (flatEventsByDate.get(iso) ?? []).filter((e) => visibleCategories.has(e.category));
    return [...classes, ...rest];
  };

  const upcomingByMonth = useMemo(() => {
    const upcoming = flatEvents
      .filter((e) => visibleCategories.has(e.category) && daysUntil(e.date) >= 0)
      .sort((a, b) => a.date.localeCompare(b.date));
    const groups = new Map<string, CalendarEvent[]>();
    for (const e of upcoming) {
      const d = new Date(`${e.date}T00:00:00`);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const list = groups.get(key) ?? [];
      list.push(e);
      groups.set(key, list);
    }
    return Array.from(groups.entries()).map(([key, list]) => {
      const [y, m] = key.split("-").map(Number);
      return { year: y, month: m, list };
    });
  }, [flatEvents, visibleCategories]);

  useEffect(() => {
    if (permission !== "granted") return;
    let notified: string[] = [];
    try {
      notified = JSON.parse(localStorage.getItem(NOTIFIED_KEY) ?? "[]");
    } catch {
      notified = [];
    }
    const notifiedSet = new Set(notified);
    const reminderSource = flatEvents.filter((e) => e.category === "homework" || e.category === "exam" || e.category === "event");
    const due = reminderSource.filter((e) => {
      const d = daysUntil(e.date);
      return d >= 0 && d <= REMINDER_THRESHOLD_DAYS && !notifiedSet.has(e.id);
    });
    if (due.length === 0) return;
    for (const e of due) {
      const subject = e.subjectId ? getSubject(e.subjectId) : undefined;
      const d = daysUntil(e.date);
      const when = d === 0 ? "today" : d === 1 ? "tomorrow" : `in ${d} days`;
      new Notification(`${CATEGORY_STYLE[e.category].emoji} ${subject?.name ?? "Schola"} reminder`, {
        body: `${e.title} is ${when}${e.detail ? ` — ${e.detail}` : ""}`,
      });
      notifiedSet.add(e.id);
    }
    try {
      localStorage.setItem(NOTIFIED_KEY, JSON.stringify(Array.from(notifiedSet)));
    } catch {
      // ignore storage errors
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [permission, flatEvents]);

  const requestReminders = async () => {
    if (typeof Notification === "undefined") return;
    const result = await Notification.requestPermission();
    setPermission(result);
  };

  const grid = useMemo(() => buildMonthGrid(viewYear, viewMonth), [viewYear, viewMonth]);
  const goToMonth = (delta: number) => {
    const d = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  };

  const selectedDayEvents = getEventsForDate(selectedDate);
  const selectedDateObj = new Date(`${selectedDate}T00:00:00`);

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-2 text-navy">
        <CalendarIcon className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Calendar</h1>
      </header>

      {/* Category legend / filter */}
      <div className="flex flex-wrap gap-2">
        {ALL_CATEGORIES.map((cat) => {
          const style = CATEGORY_STYLE[cat];
          const active = visibleCategories.has(cat);
          return (
            <button
              key={cat}
              onClick={() => toggleCategory(cat)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-opacity ${
                active ? `${style.bg} ${style.text} border-transparent` : "border-slate-200 text-slate-400 opacity-60"
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${style.dot}`} />
              {style.label}
            </button>
          );
        })}
      </div>

      {/* Reminders */}
      <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
              permission === "granted" ? "bg-mint/10 text-mint" : "bg-blue/10 text-blue"
            }`}
          >
            {permission === "granted" ? <Bell className="h-4.5 w-4.5" /> : <BellOff className="h-4.5 w-4.5" />}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-800">Automatic reminders</p>
            <p className="text-xs text-slate-500">
              {permission === "granted"
                ? `You'll be notified ${REMINDER_THRESHOLD_DAYS} days before an exam, deadline, or event.`
                : permission === "denied"
                  ? "Notifications are blocked — enable them in your browser's site settings."
                  : permission === "unsupported"
                    ? "Notifications aren't supported in this browser."
                    : "Turn on reminders so you never miss an exam or deadline."}
            </p>
          </div>
        </div>
        {permission === "default" && (
          <button
            type="button"
            onClick={requestReminders}
            className="shrink-0 rounded-lg bg-blue px-3.5 py-2 text-xs font-semibold text-white hover:brightness-95"
          >
            Enable Reminders
          </button>
        )}
        {permission === "granted" && (
          <span className="shrink-0 rounded-full bg-mint/10 text-mint text-xs font-semibold px-3 py-1">
            On
          </span>
        )}
      </div>

      {/* Month grid */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => goToMonth(-1)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <p className="font-bold text-navy">
            {monthName(viewMonth)} {viewYear}
          </p>
          <button
            onClick={() => goToMonth(1)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-slate-400 mb-1">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div key={d}>{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {grid.map(({ date, inMonth }) => {
            const iso = toIsoDate(date);
            const chipEvents = (flatEventsByDate.get(iso) ?? []).filter((e) => visibleCategories.has(e.category));
            const hasClass = visibleCategories.has("class") && getClassesForDate(iso).length > 0;
            const isToday = iso === todayIso;
            const isSelected = iso === selectedDate;
            const visibleChips = chipEvents.slice(0, 2);
            const extraCount = chipEvents.length - visibleChips.length;
            return (
              <button
                key={iso}
                onClick={() => setSelectedDate(iso)}
                className={`min-h-[60px] rounded-lg p-1 flex flex-col gap-0.5 text-left ${
                  isSelected
                    ? "bg-navy text-white"
                    : isToday
                      ? "bg-blue/10 ring-1 ring-blue"
                      : inMonth
                        ? "hover:bg-slate-50"
                        : "opacity-30"
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span
                    className={`text-xs ${
                      isSelected ? "font-bold text-white" : isToday ? "font-bold text-blue" : "text-slate-600"
                    }`}
                  >
                    {date.getDate()}
                  </span>
                  {hasClass && (
                    <span
                      className={`h-1.5 w-1.5 shrink-0 rounded-full ${CATEGORY_STYLE.class.dot} ${
                        isSelected ? "ring-1 ring-white/40" : ""
                      }`}
                    />
                  )}
                </div>
                <div className="flex flex-col gap-0.5 min-w-0">
                  {visibleChips.map((e) => {
                    const style = CATEGORY_STYLE[e.category];
                    const subject = e.subjectId ? getSubject(e.subjectId) : undefined;
                    return (
                      <span
                        key={e.id}
                        className={`block w-full truncate rounded px-1 text-[8px] font-medium leading-tight ${
                          isSelected ? "bg-white/20 text-white" : `${style.bg} ${style.text}`
                        }`}
                      >
                        {subject ? `${subject.name} · ${e.title}` : e.title}
                      </span>
                    );
                  })}
                  {extraCount > 0 && (
                    <span className={`text-[8px] leading-tight ${isSelected ? "text-white/70" : "text-slate-400"}`}>
                      +{extraCount} more
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected day detail */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <p className="font-bold text-navy mb-3">
          {selectedDateObj.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
          {selectedDate === todayIso && (
            <span className="ml-2 rounded-full bg-blue/10 text-blue text-[11px] font-semibold px-2 py-0.5 align-middle">
              Today
            </span>
          )}
        </p>
        {selectedDayEvents.length === 0 ? (
          <p className="text-sm text-slate-400">Nothing scheduled this day.</p>
        ) : (
          <div className="space-y-2">
            {selectedDayEvents.map((e) => {
              const style = CATEGORY_STYLE[e.category];
              const subject = e.subjectId ? getSubject(e.subjectId) : undefined;
              const Icon = subject ? getSubjectIcon(subject.icon) : undefined;
              return (
                <div key={e.id} className={`flex items-center gap-3 rounded-lg p-2.5 ${style.bg}`}>
                  <span className={`h-2 w-2 shrink-0 rounded-full ${style.dot}`} />
                  {Icon && <Icon className={`h-4 w-4 shrink-0 ${style.text}`} />}
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-medium ${style.text}`}>{e.title}</p>
                    {e.detail && <p className="text-xs text-slate-500">{e.detail}</p>}
                  </div>
                  {e.time && <span className="shrink-0 text-xs font-semibold text-slate-500">{e.time}</span>}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Upcoming list grouped by month (excludes recurring classes) */}
      <div className="space-y-6">
        {upcomingByMonth.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-400">
            No upcoming items for the selected categories.
          </div>
        )}
        {upcomingByMonth.map(({ year, month, list }) => (
          <section key={`${year}-${month}`}>
            <h2 className="font-bold text-navy mb-2">{monthName(month)}</h2>
            <div className="space-y-2">
              {list.map((e) => {
                const subject = e.subjectId ? getSubject(e.subjectId) : undefined;
                const style = CATEGORY_STYLE[e.category];
                const d = new Date(`${e.date}T00:00:00`);
                return (
                  <div
                    key={e.id}
                    className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3.5"
                  >
                    <div className="flex flex-col items-center justify-center w-11 shrink-0">
                      <span className="text-[11px] font-semibold text-slate-400 uppercase">
                        {monthName(month).slice(0, 3)}
                      </span>
                      <span className="text-lg font-bold text-slate-800 leading-none">{d.getDate()}</span>
                    </div>
                    <span className={`h-2 w-2 shrink-0 rounded-full ${style.dot}`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold" style={{ color: subject?.color }}>
                        {subject ? `${subject.name} · ` : ""}
                        {style.label}
                      </p>
                      <p className="font-medium text-slate-800 truncate">{e.title}</p>
                      {e.detail && <p className="text-xs text-slate-400 mt-0.5">{e.detail}</p>}
                    </div>
                    <span className="shrink-0 text-xs font-semibold text-slate-400">
                      {relativeDayLabel(e.date)}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
