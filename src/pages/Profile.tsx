import { useMemo } from "react";
import { CalendarCheck, CheckCircle2, Clock, GraduationCap, Mail, Phone, School, XCircle } from "lucide-react";
import { useAppData } from "../store/AppDataContext";
import { useRole } from "../store/RoleContext";
import { useAuth } from "../store/AuthContext";
import { useCurrentPersona } from "../hooks/useCurrentPersona";
import { isSupabaseConfigured } from "../lib/supabaseClient";
import { getSubjectIcon } from "../subjectIcons";
import { formatFullDate } from "../dateUtils";
import type { AttendanceStatus } from "../types";
import TeacherProfile from "./TeacherProfile";
import AdminProfile from "./AdminProfile";
import ParentProfile from "./ParentProfile";
import FeesSummarySection from "../components/FeesSummary";

const STATUS_STYLE: Record<AttendanceStatus, { label: string; icon: typeof CheckCircle2; className: string }> = {
  present: { label: "Present", icon: CheckCircle2, className: "text-mint bg-mint/10" },
  absent: { label: "Absent", icon: XCircle, className: "text-red-500 bg-red-50" },
  late: { label: "Late", icon: Clock, className: "text-amber-600 bg-amber-50" },
};

export default function Profile() {
  const { role } = useRole();
  const { assignments, attendanceRecords, subjects, getSubject, feesFeatureEnabled, myFeePlans } = useAppData();
  const { profile, schoolName } = useAuth();
  const isReal = isSupabaseConfigured && profile?.role === "student";
  const persona = useCurrentPersona();
  const completed = assignments.filter((a) => a.status === "completed").length;
  const total = assignments.length;
  const completionRate = total === 0 ? 0 : Math.round((completed / total) * 100);

  const attendanceRate = useMemo(() => {
    if (attendanceRecords.length === 0) return 100;
    const attended = attendanceRecords.filter((r) => r.status !== "absent").length;
    return Math.round((attended / attendanceRecords.length) * 1000) / 10;
  }, [attendanceRecords]);

  const bySubject = useMemo(() => {
    return subjects
      .map((s) => {
        const records = attendanceRecords.filter((r) => r.subjectId === s.id);
        if (records.length === 0) return null;
        const attended = records.filter((r) => r.status !== "absent").length;
        const rate = Math.round((attended / records.length) * 100);
        return { subject: s, rate, total: records.length };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
  }, [subjects, attendanceRecords]);

  const recentByDate = useMemo(() => {
    const dates = Array.from(new Set(attendanceRecords.map((r) => r.date))).slice(0, 8);
    return dates.map((date) => ({
      date,
      records: attendanceRecords.filter((r) => r.date === date),
    }));
  }, [attendanceRecords]);

  if (role === "teacher") return <TeacherProfile />;
  if (role === "admin") return <AdminProfile />;
  if (role === "parent") return <ParentProfile />;

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-2 text-navy">
        <GraduationCap className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Profile</h1>
      </header>

      <div className="rounded-2xl bg-navy text-white p-6 flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-mint text-navy font-bold text-xl shrink-0">
          {persona.initials}
        </div>
        <div>
          <h2 className="text-xl font-bold">{persona.name}</h2>
          <p className="text-slate-300 text-sm">
            {isReal && profile?.grade ? `Grade ${profile.grade} · Student` : persona.subtitle}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-2xl font-bold text-navy">{completionRate}%</p>
          <p className="text-xs text-slate-500 mt-0.5">Assignments completed</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-2xl font-bold text-navy">
            {completed}/{total}
          </p>
          <p className="text-xs text-slate-500 mt-0.5">Tasks finished</p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white divide-y divide-slate-100">
        <InfoRow icon={School} label="School" value={isReal ? schoolName ?? "—" : "Schola Academy"} />
        <InfoRow icon={Mail} label="Email" value={isReal ? profile?.email ?? "—" : "amara.silva@schola.edu"} />
        {!isReal && <InfoRow icon={Phone} label="Contact" value="+1 (555) 010-2938" />}
      </div>

      {feesFeatureEnabled && <FeesSummarySection plans={myFeePlans} />}

      {/* Attendance */}
      <section>
        <div className="flex items-center gap-2 text-navy mb-3">
          <CalendarCheck className="h-5 w-5" />
          <h2 className="font-bold text-lg">My Attendance</h2>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 mb-3">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-medium text-slate-600">Overall attendance rate</p>
            <p className="text-2xl font-bold text-mint">{attendanceRate}%</p>
          </div>
          <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
            <div className="h-full bg-mint rounded-full" style={{ width: `${attendanceRate}%` }} />
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 mb-3">
          {bySubject.map(({ subject, rate }) => {
            const Icon = getSubjectIcon(subject.icon);
            return (
              <div
                key={subject.id}
                className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3"
              >
                <div
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                  style={{ backgroundColor: `${subject.color}1A`, color: subject.color }}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <p className="text-sm font-medium text-slate-700 flex-1 truncate">{subject.name}</p>
                <p className="text-sm font-semibold text-slate-500">{rate}%</p>
              </div>
            );
          })}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white divide-y divide-slate-100">
          {recentByDate.map(({ date, records }) => (
            <div key={date} className="p-3.5">
              <p className="text-xs font-semibold text-slate-400 mb-2">{formatFullDate(date)}</p>
              <div className="flex flex-wrap gap-2">
                {records.map((r) => {
                  const subject = getSubject(r.subjectId);
                  const style = STATUS_STYLE[r.status];
                  const StatusIcon = style.icon;
                  return (
                    <span
                      key={r.id}
                      className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium ${style.className}`}
                    >
                      <StatusIcon className="h-3.5 w-3.5 shrink-0" />
                      {subject?.name} · {style.label}
                    </span>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof School;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 p-4">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue/10 text-blue shrink-0">
        <Icon className="h-4.5 w-4.5" />
      </div>
      <div>
        <p className="text-xs text-slate-400">{label}</p>
        <p className="text-sm font-medium text-slate-800">{value}</p>
      </div>
    </div>
  );
}
