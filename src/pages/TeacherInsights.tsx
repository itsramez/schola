import { useState } from "react";
import type { ReactNode } from "react";
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Clock,
  FileQuestion,
  LineChart,
  TrendingUp,
  Users,
  XCircle,
} from "lucide-react";
import { useAppData } from "../store/AppDataContext";
import { useAuth } from "../store/AuthContext";
import { formatFullDate } from "../dateUtils";
import type { AttendanceStatus } from "../types";
import { average, computeTrend, MetricPill, StatCard } from "../components/insightsShared";

interface StudentMetrics {
  studentId: string;
  studentName: string;
  attendancePct: number | null;
  gradePct: number | null;
  quizPct: number | null;
}

const NEEDS_ATTENTION_QUIZ_THRESHOLD = 50;
type DetailTab = "quizzes" | "attendance" | "assignments";
const ATTENDANCE_STYLE: Record<AttendanceStatus, { label: string; icon: typeof CheckCircle2; className: string }> = {
  present: { label: "Present", icon: CheckCircle2, className: "text-mint bg-mint/10" },
  absent: { label: "Absent", icon: XCircle, className: "text-red-500 bg-red-50" },
  late: { label: "Late", icon: Clock, className: "text-amber-600 bg-amber-50" },
};

export default function TeacherInsights() {
  const { profile } = useAuth();
  const { realStudents, teacherAssignmentResults, teacherQuizResults, attendanceRecords } = useAppData();
  const [expandedStudentId, setExpandedStudentId] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<DetailTab>("quizzes");

  const gradedRows = teacherAssignmentResults.flatMap((a) =>
    a.submissions
      .filter((s) => s.review?.score !== undefined && s.review?.outOf && s.review?.reviewedAt)
      .map((s) => ({ studentId: s.studentId, ratio: s.review!.score! / s.review!.outOf!, ts: s.review!.reviewedAt })),
  );
  const quizRows = teacherQuizResults.flatMap((q) =>
    q.results.map((r) => ({ studentId: r.studentId, ratio: r.score / r.outOf, ts: r.submittedAt })),
  );
  const myAttendance = attendanceRecords.filter((r) => r.subjectId === profile?.id);

  const avgGradePct = average(gradedRows.map((r) => r.ratio * 100));
  const avgQuizPct = average(quizRows.map((r) => r.ratio * 100));
  const avgAttendancePct =
    myAttendance.length === 0
      ? null
      : Math.round((myAttendance.filter((r) => r.status !== "absent").length / myAttendance.length) * 100);

  const gradeTrend = computeTrend(gradedRows.map((r) => ({ ts: r.ts, pct: r.ratio * 100 })));
  const quizTrend = computeTrend(quizRows.map((r) => ({ ts: r.ts, pct: r.ratio * 100 })));
  const attendanceTrend = computeTrend(
    myAttendance.map((r) => ({ ts: r.date, pct: r.status !== "absent" ? 100 : 0 })),
  );

  const perStudent: StudentMetrics[] = realStudents.map((s) => {
    const grades = gradedRows.filter((r) => r.studentId === s.id).map((r) => r.ratio * 100);
    const quizzes = quizRows.filter((r) => r.studentId === s.id).map((r) => r.ratio * 100);
    const attendance = myAttendance.filter((r) => r.studentId === s.id);
    return {
      studentId: s.id,
      studentName: s.name,
      attendancePct: attendance.length === 0 ? null : Math.round((attendance.filter((r) => r.status !== "absent").length / attendance.length) * 100),
      gradePct: average(grades),
      quizPct: average(quizzes),
    };
  });

  const quizDetailsFor = (studentId: string) =>
    teacherQuizResults
      .flatMap((q) =>
        q.results
          .filter((r) => r.studentId === studentId)
          .map((r) => ({ title: q.title, score: r.score, outOf: r.outOf, date: r.submittedAt })),
      )
      .sort((a, b) => b.date.localeCompare(a.date));

  const gradeDetailsFor = (studentId: string) =>
    teacherAssignmentResults
      .flatMap((a) =>
        a.submissions
          .filter((s) => s.studentId === studentId && s.review?.score !== undefined && s.review?.outOf)
          .map((s) => ({ title: a.title, score: s.review!.score!, outOf: s.review!.outOf!, date: s.review!.reviewedAt })),
      )
      .sort((a, b) => b.date.localeCompare(a.date));

  const attendanceDetailsFor = (studentId: string) =>
    myAttendance.filter((r) => r.studentId === studentId).sort((a, b) => b.date.localeCompare(a.date));

  const needsAttention = perStudent.filter(
    (s) => s.quizPct !== null && s.quizPct < NEEDS_ATTENTION_QUIZ_THRESHOLD,
  );

  return (
    <div className="space-y-6">
      <header className="text-navy">
        <div className="flex items-center gap-2">
          <LineChart className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Insights</h1>
        </div>
        <p className="text-xs text-slate-400 mt-1">Trends compare the last 7 days to the 7 days before that.</p>
      </header>

      <section className="grid grid-cols-3 gap-3">
        <StatCard label="Average Grade" value={avgGradePct === null ? "—" : `${avgGradePct}%`} trend={gradeTrend} />
        <StatCard
          label="Average Attendance"
          value={avgAttendancePct === null ? "—" : `${avgAttendancePct}%`}
          trend={attendanceTrend}
        />
        <StatCard label="Average Quiz Score" value={avgQuizPct === null ? "—" : `${avgQuizPct}%`} trend={quizTrend} />
      </section>

      <section>
        <div className="flex items-center gap-2 mb-3 text-navy">
          <TrendingUp className="h-4.5 w-4.5" />
          <h2 className="font-bold text-lg">Needs Attention</h2>
        </div>
        {needsAttention.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-slate-400 text-sm">
            No students below {NEEDS_ATTENTION_QUIZ_THRESHOLD}% quiz average right now — everyone's on track.
          </div>
        ) : (
          <div className="space-y-2">
            {needsAttention.map((s) => (
              <div
                key={s.studentId}
                className="flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-3.5"
              >
                <p className="text-sm font-semibold text-red-700">{s.studentName}</p>
                <MetricPill label="Quiz" value={s.quizPct} />
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="flex items-center gap-2 mb-3 text-navy">
          <Users className="h-4.5 w-4.5" />
          <h2 className="font-bold text-lg">By Student</h2>
        </div>
        {perStudent.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-slate-400 text-sm">
            No student accounts yet.
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            {perStudent.map((s, i) => {
              const expanded = expandedStudentId === s.studentId;
              return (
                <div key={s.studentId} className={i > 0 ? "border-t border-slate-100" : ""}>
                  <button
                    onClick={() => {
                      setExpandedStudentId(expanded ? null : s.studentId);
                      setDetailTab("quizzes");
                    }}
                    className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-slate-50"
                  >
                    <p className="text-sm font-medium text-slate-800 truncate">{s.studentName}</p>
                    <div className="flex items-center gap-2 text-xs font-semibold shrink-0">
                      <MetricPill label="Att." value={s.attendancePct} />
                      <MetricPill label="Grade" value={s.gradePct} />
                      <MetricPill label="Quiz" value={s.quizPct} />
                      {expanded ? (
                        <ChevronUp className="h-4 w-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-slate-400" />
                      )}
                    </div>
                  </button>
                  {expanded && (
                    <div className="border-t border-slate-100 bg-slate-50 px-4 py-4">
                      <div className="flex gap-2 mb-3">
                        {(
                          [
                            { key: "quizzes", label: "Quizzes" },
                            { key: "assignments", label: "Assignments" },
                            { key: "attendance", label: "Attendance" },
                          ] as const
                        ).map((t) => (
                          <button
                            key={t.key}
                            onClick={() => setDetailTab(t.key)}
                            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                              detailTab === t.key
                                ? "bg-navy text-white"
                                : "bg-white text-slate-500 border border-slate-200 hover:border-navy/30"
                            }`}
                          >
                            {t.label}
                          </button>
                        ))}
                      </div>

                      {detailTab === "quizzes" && (
                        <DetailSection icon={FileQuestion} title="Quizzes" emptyText="No quizzes taken yet.">
                          {quizDetailsFor(s.studentId).map((q, idx) => (
                            <div key={idx} className="flex items-center justify-between gap-3 text-sm">
                              <p className="text-slate-600 truncate">{q.title}</p>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="text-[11px] text-slate-400">{formatFullDate(q.date)}</span>
                                <span className="rounded-full bg-mint/10 text-mint text-xs font-semibold px-2.5 py-1">
                                  {q.score}/{q.outOf}
                                </span>
                              </div>
                            </div>
                          ))}
                        </DetailSection>
                      )}

                      {detailTab === "assignments" && (
                        <DetailSection icon={ClipboardList} title="Assignment Grades" emptyText="No graded assignments yet.">
                          {gradeDetailsFor(s.studentId).map((g, idx) => (
                            <div key={idx} className="flex items-center justify-between gap-3 text-sm">
                              <p className="text-slate-600 truncate">{g.title}</p>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="text-[11px] text-slate-400">{formatFullDate(g.date)}</span>
                                <span className="rounded-full bg-mint/10 text-mint text-xs font-semibold px-2.5 py-1">
                                  {g.score}/{g.outOf}
                                </span>
                              </div>
                            </div>
                          ))}
                        </DetailSection>
                      )}

                      {detailTab === "attendance" && (
                        <DetailSection icon={Clock} title="Attendance" emptyText="No attendance recorded yet.">
                          {attendanceDetailsFor(s.studentId).map((r, idx) => {
                            const meta = ATTENDANCE_STYLE[r.status];
                            const Icon = meta.icon;
                            return (
                              <div key={idx} className="flex items-center justify-between gap-3 text-sm">
                                <p className="text-slate-600">{formatFullDate(r.date)}</p>
                                <span
                                  className={`flex items-center gap-1 rounded-full text-xs font-semibold px-2.5 py-1 shrink-0 ${meta.className}`}
                                >
                                  <Icon className="h-3 w-3" />
                                  {meta.label}
                                </span>
                              </div>
                            );
                          })}
                        </DetailSection>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function DetailSection({
  icon: Icon,
  title,
  emptyText,
  children,
}: {
  icon: typeof FileQuestion;
  title: string;
  emptyText: string;
  children: ReactNode[];
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-slate-500 mb-2">
        <Icon className="h-3.5 w-3.5" />
        <p className="text-xs font-semibold">{title}</p>
      </div>
      <div className="space-y-1.5 rounded-lg bg-white border border-slate-100 p-3">
        {children.length === 0 ? (
          <p className="text-xs text-slate-400">{emptyText}</p>
        ) : (
          children
        )}
      </div>
    </div>
  );
}
