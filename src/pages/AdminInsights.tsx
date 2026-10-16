import { BarChart3, LineChart, TrendingUp, Users } from "lucide-react";
import { useAppData } from "../store/AppDataContext";
import { average, computeTrend, MetricPill, StatCard } from "../components/insightsShared";

const NEEDS_ATTENTION_QUIZ_THRESHOLD = 50;

export default function AdminInsights() {
  const { riskSnapshots, subjects, attendanceRecords } = useAppData();

  const gradedRows = riskSnapshots.flatMap((s) =>
    s.assignments
      .filter((a) => a.review?.score !== undefined && a.review?.outOf && a.review?.reviewedAt)
      .map((a) => ({
        subjectId: a.subjectId,
        ratio: a.review!.score! / a.review!.outOf!,
        ts: a.review!.reviewedAt,
      })),
  );
  const quizRows = riskSnapshots.flatMap((s) =>
    s.quizScores.map((q) => ({ studentId: s.studentId, ratio: q.score / q.outOf, ts: q.submittedAt })),
  );

  const avgGradePct = average(gradedRows.map((r) => r.ratio * 100));
  const avgQuizPct = average(quizRows.map((r) => r.ratio * 100));
  const avgAttendancePct =
    attendanceRecords.length === 0
      ? null
      : Math.round((attendanceRecords.filter((r) => r.status !== "absent").length / attendanceRecords.length) * 100);

  const gradeTrend = computeTrend(gradedRows.map((r) => ({ ts: r.ts, pct: r.ratio * 100 })));
  const quizTrend = computeTrend(quizRows.map((r) => ({ ts: r.ts, pct: r.ratio * 100 })));
  const attendanceTrend = computeTrend(
    attendanceRecords.map((r) => ({ ts: r.date, pct: r.status !== "absent" ? 100 : 0 })),
  );

  const perStudent = riskSnapshots.map((s) => {
    const grades = s.assignments
      .filter((a) => a.review?.score !== undefined && a.review?.outOf)
      .map((a) => (a.review!.score! / a.review!.outOf!) * 100);
    const quizzes = s.quizScores.map((q) => (q.score / q.outOf) * 100);
    return {
      studentId: s.studentId,
      studentName: s.studentName,
      attendancePct:
        s.attendanceRecords.length === 0
          ? null
          : Math.round((s.attendanceRecords.filter((r) => r.status !== "absent").length / s.attendanceRecords.length) * 100),
      gradePct: average(grades),
      quizPct: average(quizzes),
    };
  });

  const needsAttention = perStudent.filter(
    (s) => s.quizPct !== null && s.quizPct < NEEDS_ATTENTION_QUIZ_THRESHOLD,
  );

  const byClass = subjects.map((subj) => {
    const classAttendance = attendanceRecords.filter((r) => r.subjectId === subj.id);
    const classGrades = gradedRows.filter((r) => r.subjectId === subj.id);
    return {
      subjectId: subj.id,
      name: subj.name,
      teacher: subj.teacher,
      attendancePct:
        classAttendance.length === 0
          ? null
          : Math.round((classAttendance.filter((r) => r.status !== "absent").length / classAttendance.length) * 100),
      gradePct: average(classGrades.map((r) => r.ratio * 100)),
    };
  });

  return (
    <div className="space-y-6">
      <header className="text-navy">
        <div className="flex items-center gap-2">
          <LineChart className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Insights</h1>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          School-wide trends — compares the last 7 days to the 7 days before that.
        </p>
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
          <BarChart3 className="h-4.5 w-4.5" />
          <h2 className="font-bold text-lg">By Class</h2>
        </div>
        {byClass.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-slate-400 text-sm">
            No teacher accounts yet.
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden divide-y divide-slate-100">
            {byClass.map((c) => (
              <div key={c.subjectId} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{c.name}</p>
                  <p className="text-xs text-slate-400">{c.teacher}</p>
                </div>
                <div className="flex items-center gap-2 text-xs font-semibold shrink-0">
                  <MetricPill label="Att." value={c.attendancePct} />
                  <MetricPill label="Grade" value={c.gradePct} />
                </div>
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
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden divide-y divide-slate-100">
            {perStudent.map((s) => (
              <div key={s.studentId} className="flex items-center justify-between gap-3 px-4 py-3">
                <p className="text-sm font-medium text-slate-800 truncate">{s.studentName}</p>
                <div className="flex items-center gap-2 text-xs font-semibold shrink-0">
                  <MetricPill label="Att." value={s.attendancePct} />
                  <MetricPill label="Grade" value={s.gradePct} />
                  <MetricPill label="Quiz" value={s.quizPct} />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
