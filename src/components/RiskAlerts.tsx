import type { LucideIcon } from "lucide-react";
import { CalendarX, ClipboardX } from "lucide-react";
import { useAppData } from "../store/AppDataContext";
import { getAbsenceStreak, getMissedAssignmentStreak } from "../riskDetection";

const TONE_STYLE = {
  red: { bg: "bg-red-50", border: "border-red-200", icon: "text-red-500", title: "text-red-700" },
  amber: { bg: "bg-amber-50", border: "border-amber-200", icon: "text-amber-600", title: "text-amber-700" },
};

export default function RiskAlerts() {
  const { riskSnapshots } = useAppData();

  const perStudentAlerts = riskSnapshots.flatMap((snapshot) => {
    const absence = getAbsenceStreak(snapshot.attendanceRecords);
    const missed = getMissedAssignmentStreak(snapshot.assignments);
    const alerts: { key: string; icon: LucideIcon; title: string; detail: string }[] = [];
    if (absence.flagged) {
      alerts.push({
        key: `${snapshot.studentId}-absence`,
        icon: CalendarX,
        title: `${snapshot.studentName} — ${absence.streak}-day unexplained absence streak`,
        detail: `Marked absent for every class on ${absence.streak} consecutive school days, with no excuse on file. Notified: Admin + homeroom teacher.`,
      });
    }
    if (missed.flagged) {
      alerts.push({
        key: `${snapshot.studentId}-missed`,
        icon: ClipboardX,
        title: `${snapshot.studentName} — ${missed.streak} assignments missed in a row`,
        detail: `${missed.titles.join(", ")}. Notified: Admin + subject teachers.`,
      });
    }
    return alerts;
  });

  if (perStudentAlerts.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-5 text-center text-sm text-slate-400">
        No risk alerts right now — everything looks on track.
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {perStudentAlerts.map((alert) => (
        <AlertCard key={alert.key} icon={alert.icon} tone="red" title={alert.title} detail={alert.detail} />
      ))}
    </div>
  );
}

function AlertCard({
  icon: Icon,
  tone,
  title,
  detail,
}: {
  icon: LucideIcon;
  tone: "red" | "amber";
  title: string;
  detail: string;
}) {
  const style = TONE_STYLE[tone];
  return (
    <div className={`flex items-start gap-3 rounded-xl border ${style.border} ${style.bg} p-3.5`}>
      <Icon className={`h-5 w-5 shrink-0 mt-0.5 ${style.icon}`} />
      <div className="min-w-0">
        <p className={`text-sm font-semibold ${style.title}`}>{title}</p>
        <p className="text-xs text-slate-600 mt-0.5">{detail}</p>
      </div>
    </div>
  );
}
