import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import {
  BarChart3,
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FileQuestion,
  FilePlus2,
  Pencil,
  Percent,
  Plus,
  Settings,
  Table2,
  Trash2,
  X,
} from "lucide-react";
import { useAppData, type NewExamInput, type NewQuizInput } from "../store/AppDataContext";
import { useAuth } from "../store/AuthContext";
import { isSupabaseConfigured } from "../lib/supabaseClient";
import Modal from "../components/Modal";
import { formatFullDate } from "../dateUtils";
import type { ExamKind, TeacherExamSummary } from "../types";

type Tab = "quizzes" | "exams" | "gradebook";

const EXAM_KIND_LABEL: Record<ExamKind, string> = {
  quiz: "Quiz",
  midterm: "Midterm",
  final: "Final",
  exam: "Exam",
};

/** Σ(pct × weight) / Σ(weight) — weights are the teacher's own choice and don't need to sum to 100. */
function weightedAverage(items: { pct: number; weight: number }[]): number | null {
  const totalWeight = items.reduce((sum, i) => sum + i.weight, 0);
  if (totalWeight <= 0) return null;
  return items.reduce((sum, i) => sum + i.pct * i.weight, 0) / totalWeight;
}

export default function TeacherQuizzes() {
  const { teacherQuizResults, teacherExamResults, tests, gradebookFeatureEnabled, updateQuizWeight, updateExamWeight } =
    useAppData();
  const { profile } = useAuth();
  const [tab, setTab] = useState<Tab>("quizzes");
  const [createOpen, setCreateOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [defaultsOpen, setDefaultsOpen] = useState(false);
  const [expandedQuizId, setExpandedQuizId] = useState<string | null>(null);
  const [gradingExamId, setGradingExamId] = useState<string | null>(null);

  const totalQuizzes = teacherQuizResults.length;
  const totalResponses = teacherQuizResults.reduce((sum, q) => sum + q.results.length, 0);
  const overallAvgPct =
    totalResponses === 0
      ? null
      : Math.round(
          (teacherQuizResults.reduce((sum, q) => sum + q.results.reduce((s, r) => s + r.score / r.outOf, 0), 0) /
            totalResponses) *
            100,
        );

  const myExams = tests
    .filter((t) => t.subjectId === profile?.id)
    .sort((a, b) => a.date.localeCompare(b.date));

  const gradingExam = teacherExamResults.find((e) => e.examId === gradingExamId);

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-navy">
          <FileQuestion className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Testing</h1>
        </div>
        <div className="flex items-center gap-2">
          {gradebookFeatureEnabled && (
            <button
              onClick={() => setDefaultsOpen(true)}
              title="Grading defaults"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:border-blue/30 hover:text-blue"
            >
              <Settings className="h-4 w-4" />
            </button>
          )}
          {tab !== "gradebook" && (
            <button
              onClick={() => (tab === "quizzes" ? setCreateOpen(true) : setScheduleOpen(true))}
              className="flex items-center gap-1.5 rounded-lg bg-blue px-3.5 py-2 text-sm font-semibold text-white hover:brightness-95"
            >
              <Plus className="h-4 w-4" />
              {tab === "quizzes" ? "Create Quiz" : "Schedule Exam"}
            </button>
          )}
        </div>
      </header>

      <div className="flex gap-2">
        {(
          [
            { key: "quizzes", label: "Quizzes" },
            { key: "exams", label: "Exams" },
            ...(gradebookFeatureEnabled ? [{ key: "gradebook", label: "Gradebook" }] : []),
          ] as { key: Tab; label: string }[]
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

      {tab === "exams" && (
        <section>
          {myExams.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-400">
              No exams scheduled yet — schedule one to get started.
            </div>
          ) : (
            <div className="space-y-2.5">
              {myExams.map((e) => {
                const summary = teacherExamResults.find((r) => r.examId === e.id);
                const avg =
                  !summary || summary.grades.length === 0
                    ? null
                    : Math.round(
                        (summary.grades.reduce((s, g) => s + g.score / g.outOf, 0) / summary.grades.length) * 100,
                      );
                return (
                  <div key={e.id} className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                        <CalendarClock className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-slate-800 truncate">{e.title}</p>
                        <p className="text-xs text-slate-400 flex items-center gap-1 flex-wrap">
                          <span>
                            {EXAM_KIND_LABEL[e.kind ?? "exam"]} · {formatFullDate(e.date)}
                            {e.detail ? ` · ${e.detail}` : ""}
                          </span>
                          {gradebookFeatureEnabled && (
                            <>
                              <span>·</span>
                              <WeightEditor value={e.weightPercent} onSave={(w) => updateExamWeight(e.id, w)} />
                            </>
                          )}
                        </p>
                      </div>
                      {gradebookFeatureEnabled && (
                        <div className="text-right shrink-0">
                          <button
                            onClick={() => setGradingExamId(e.id)}
                            className="rounded-lg border border-blue/30 px-3 py-1.5 text-xs font-semibold text-blue hover:bg-blue/5"
                          >
                            Enter Grades
                          </button>
                          <p className="text-[11px] text-slate-400 mt-1">
                            {summary?.grades.length ?? 0} graded{avg !== null ? ` · ${avg}% avg` : ""}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {tab === "gradebook" && gradebookFeatureEnabled && <GradebookTab />}

      {tab === "quizzes" && (
      <>

      {/* Stats + chart overview */}
      <section>
        <div className="grid grid-cols-3 gap-3 mb-3">
          <StatCard label="Quizzes" value={String(totalQuizzes)} />
          <StatCard label="Responses" value={String(totalResponses)} />
          <StatCard label="Overall average" value={overallAvgPct === null ? "—" : `${overallAvgPct}%`} />
        </div>

        {totalQuizzes > 0 && (
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center gap-2 mb-3 text-navy">
              <BarChart3 className="h-4.5 w-4.5" />
              <p className="font-semibold text-sm">Average score by quiz</p>
            </div>
            <div className="space-y-2.5">
              {teacherQuizResults.map((q) => {
                const avg =
                  q.results.length === 0
                    ? null
                    : Math.round((q.results.reduce((s, r) => s + r.score / r.outOf, 0) / q.results.length) * 100);
                return (
                  <div key={q.quizId} className="flex items-center gap-3">
                    <p className="w-28 shrink-0 truncate text-xs text-slate-500">{q.title}</p>
                    <div className="flex-1 h-2.5 rounded-full bg-slate-100 overflow-hidden">
                      {avg !== null && (
                        <div
                          className={`h-full rounded-full ${
                            avg >= 85 ? "bg-mint" : avg >= 60 ? "bg-blue" : "bg-amber-500"
                          }`}
                          style={{ width: `${avg}%` }}
                        />
                      )}
                    </div>
                    <p className="w-10 shrink-0 text-right text-xs font-semibold text-slate-600">
                      {avg === null ? "—" : `${avg}%`}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* Quiz list */}
      <section>
        <h2 className="font-bold text-lg text-navy mb-3">All Quizzes</h2>
        {teacherQuizResults.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-400">
            No quizzes yet — create one to get started.
          </div>
        ) : (
          <div className="space-y-2.5">
            {teacherQuizResults.map((q) => {
              const expanded = expandedQuizId === q.quizId;
              const avg =
                q.results.length === 0
                  ? null
                  : Math.round((q.results.reduce((s, r) => s + r.score / r.outOf, 0) / q.results.length) * 100);
              return (
                <div key={q.quizId} className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                  <button
                    onClick={() => setExpandedQuizId(expanded ? null : q.quizId)}
                    className="w-full flex items-center gap-3 p-4 text-left hover:bg-slate-50"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue/10 text-blue">
                      <FileQuestion className="h-4.5 w-4.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-800 truncate">{q.title}</p>
                      <p className="text-xs text-slate-400">
                        {q.subjectLabel} · {q.totalQuestions} question{q.totalQuestions === 1 ? "" : "s"}
                        {q.dueDate ? ` · Due ${formatFullDate(q.dueDate)}` : ""}
                        {gradebookFeatureEnabled && q.weightPercent ? ` · Weight ${q.weightPercent}%` : ""}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold text-slate-700">
                        {q.results.length}/{q.assignedCount}
                      </p>
                      <p className="text-[11px] text-slate-400">{avg === null ? "no responses" : `${avg}% avg`}</p>
                    </div>
                    {expanded ? (
                      <ChevronUp className="h-4 w-4 text-slate-400 shrink-0" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
                    )}
                  </button>
                  {expanded && (
                    <div className="border-t border-slate-100">
                      {gradebookFeatureEnabled && (
                        <div className="flex items-center justify-between px-4 py-2.5 text-xs text-slate-500 border-b border-slate-100">
                          <span>Weight toward overall grade</span>
                          <WeightEditor value={q.weightPercent} onSave={(w) => updateQuizWeight(q.quizId, w)} />
                        </div>
                      )}
                      <div className="divide-y divide-slate-50">
                        {q.results.length === 0 && (
                          <p className="px-4 py-3 text-sm text-slate-400">No one has taken this quiz yet.</p>
                        )}
                        {q.results.map((r) => (
                          <div key={r.studentId} className="flex items-center justify-between px-4 py-2.5 text-sm">
                            <p className="text-slate-700">{r.studentName}</p>
                            <span className="rounded-full bg-mint/10 text-mint text-xs font-semibold px-2.5 py-1">
                              {r.score}/{r.outOf}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
      </>
      )}

      <CreateQuizModal open={createOpen} onClose={() => setCreateOpen(false)} />
      <ScheduleExamModal open={scheduleOpen} onClose={() => setScheduleOpen(false)} />
      <GradingDefaultsModal open={defaultsOpen} onClose={() => setDefaultsOpen(false)} />
      {gradingExam && <EnterGradesModal exam={gradingExam} onClose={() => setGradingExamId(null)} />}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-2xl font-bold text-navy">{value}</p>
      <p className="text-xs text-slate-500 mt-0.5">{label}</p>
    </div>
  );
}

interface GradebookRow {
  pct: number;
  weight: number;
  hasOverride: boolean;
}

interface GradebookItem {
  key: string;
  kind: "quiz" | "exam";
  id: string;
  title: string;
  defaultWeight: number;
  rows: Map<string, GradebookRow>;
}

interface OverrideTarget {
  kind: "quiz" | "exam";
  id: string;
  title: string;
  studentId: string;
  studentName: string;
  defaultWeight: number;
  currentWeight: number;
}

/** Every student touched by this teacher's quizzes/exams, with a weighted overall % per student. Click a score to set a custom weight for that one student (e.g. a modified grading plan). */
function GradebookTab() {
  const {
    teacherQuizResults,
    teacherExamResults,
    realStudents,
    myTeacherClasses,
    classRoster,
    setQuizWeightOverride,
    setExamWeightOverride,
    gradebookStudentOverridesEnabled,
  } = useAppData();
  const [overrideTarget, setOverrideTarget] = useState<OverrideTarget | null>(null);
  const [classId, setClassId] = useState("");

  const selectedClassId = classId || myTeacherClasses[0]?.id || "";

  const items: GradebookItem[] = [
    ...teacherQuizResults
      .filter((q) => !selectedClassId || q.classId === selectedClassId)
      .map((q) => ({
        key: `quiz-${q.quizId}`,
        kind: "quiz" as const,
        id: q.quizId,
        title: q.title,
        defaultWeight: q.weightPercent ?? 0,
        rows: new Map(
          q.results.map((r) => {
            const weight = r.weightPercent ?? q.weightPercent ?? 0;
            return [r.studentId, { pct: (r.score / r.outOf) * 100, weight, hasOverride: weight !== (q.weightPercent ?? 0) }];
          }),
        ),
      })),
    ...teacherExamResults
      .filter((e) => !selectedClassId || e.classId === selectedClassId)
      .map((e) => ({
        key: `exam-${e.examId}`,
        kind: "exam" as const,
        id: e.examId,
        title: e.title,
        defaultWeight: e.weightPercent ?? 0,
        rows: new Map(
          e.grades.map((g) => {
            const weight = g.weightPercent ?? e.weightPercent ?? 0;
            return [g.studentId, { pct: (g.score / g.outOf) * 100, weight, hasOverride: weight !== (e.weightPercent ?? 0) }];
          }),
        ),
      })),
  ];

  const students = selectedClassId ? classRoster(selectedClassId) : realStudents;

  const saveOverride = (weight: number | null) => {
    if (!overrideTarget) return;
    if (overrideTarget.kind === "quiz") setQuizWeightOverride(overrideTarget.id, overrideTarget.studentId, weight);
    else setExamWeightOverride(overrideTarget.id, overrideTarget.studentId, weight);
    setOverrideTarget(null);
  };

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2 text-navy">
        <Table2 className="h-4.5 w-4.5" />
        <p className="font-semibold text-sm">Weighted grades — overall % = Σ(score × weight) / Σ(weight)</p>
      </div>
      {myTeacherClasses.length > 1 && (
        <select
          value={selectedClassId}
          onChange={(e) => setClassId(e.target.value)}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none focus:border-blue"
        >
          {myTeacherClasses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.subjectName}
              {c.sectionName ? ` — ${c.sectionName}` : ""}
            </option>
          ))}
        </select>
      )}
      {gradebookStudentOverridesEnabled && (
        <p className="text-xs text-slate-400">Click a student's score to give them a custom weight for that item.</p>
      )}
      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-400">
          No weighted quizzes or exams yet for this class — add a weight (%) when you create one.
        </div>
      ) : (
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="sticky left-0 bg-white px-4 py-2.5 text-left font-semibold text-slate-600">Student</th>
              {items.map((item) => (
                <th key={item.key} className="px-3 py-2.5 text-left font-medium text-slate-500 whitespace-nowrap">
                  {item.title}
                  <span className="block text-[11px] text-slate-400">{item.defaultWeight}%</span>
                </th>
              ))}
              <th className="px-4 py-2.5 text-right font-semibold text-navy whitespace-nowrap">Overall</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {students.map((s) => {
              const overall = weightedAverage(
                items
                  .filter((item) => item.rows.has(s.id) && item.rows.get(s.id)!.weight > 0)
                  .map((item) => item.rows.get(s.id)!),
              );
              return (
                <tr key={s.id}>
                  <td className="sticky left-0 bg-white px-4 py-2.5 font-medium text-slate-700 whitespace-nowrap">
                    {s.name}
                  </td>
                  {items.map((item) => {
                    const row = item.rows.get(s.id);
                    return (
                      <td key={item.key} className="px-3 py-2.5">
                        {!row ? (
                          <span className="text-slate-400">—</span>
                        ) : gradebookStudentOverridesEnabled ? (
                          <button
                            onClick={() =>
                              setOverrideTarget({
                                kind: item.kind,
                                id: item.id,
                                title: item.title,
                                studentId: s.id,
                                studentName: s.name,
                                defaultWeight: item.defaultWeight,
                                currentWeight: row.weight,
                              })
                            }
                            title="Click to set a custom weight for this student"
                            className={`flex items-center gap-1 hover:text-blue ${
                              row.hasOverride ? "font-semibold text-slate-800" : "text-slate-500"
                            }`}
                          >
                            {Math.round(row.pct)}%
                            {row.hasOverride && (
                              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" title="Custom weight" />
                            )}
                          </button>
                        ) : (
                          <span className={row.hasOverride ? "font-semibold text-slate-800" : "text-slate-500"}>
                            {Math.round(row.pct)}%
                          </span>
                        )}
                      </td>
                    );
                  })}
                  <td className="px-4 py-2.5 text-right font-semibold text-navy">
                    {overall === null ? "—" : `${Math.round(overall)}%`}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      )}
      {overrideTarget && (
        <OverrideWeightModal target={overrideTarget} onSave={saveOverride} onClose={() => setOverrideTarget(null)} />
      )}
    </section>
  );
}

function OverrideWeightModal({
  target,
  onSave,
  onClose,
}: {
  target: OverrideTarget;
  onSave: (weight: number | null) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(String(target.currentWeight));

  return (
    <Modal open onClose={onClose} title={`Custom Weight — ${target.studentName}`}>
      <div className="space-y-3">
        <p className="text-sm text-slate-500">
          {target.title} · default weight is {target.defaultWeight}%
        </p>
        <Field label="Weight for this student (%)">
          <input
            type="number"
            min={0}
            step="0.5"
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue"
          />
        </Field>
        <div className="flex gap-2">
          <button
            onClick={() => onSave(draft.trim() ? Number(draft) : null)}
            className="flex-1 rounded-lg bg-blue px-4 py-2.5 text-sm font-semibold text-white hover:brightness-95"
          >
            Save
          </button>
          <button
            onClick={() => onSave(null)}
            className="flex-1 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            Clear (use default)
          </button>
        </div>
      </div>
    </Modal>
  );
}

interface QuizQuestionDraft {
  id: string;
  text: string;
  options: [string, string, string, string];
  correctIndex: number;
}

function newQuestion(): QuizQuestionDraft {
  return { id: `q-${Date.now()}-${Math.random()}`, text: "", options: ["", "", "", ""], correctIndex: 0 };
}

type AudienceMode = "all" | "specific";

function WeightField({
  value,
  onChange,
  label = "Weight toward overall grade (%) — optional",
}: {
  value: string;
  onChange: (v: string) => void;
  label?: string;
}) {
  return (
    <Field label={label}>
      <div className="relative">
        <input
          type="number"
          min={0}
          step="0.5"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="e.g. 5"
          className="w-full rounded-lg border border-slate-200 px-3 py-2 pr-8 text-sm outline-none focus:border-blue"
        />
        <Percent className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-300" />
      </div>
    </Field>
  );
}

/** Small inline "click to edit" control for a quiz/exam's weight, used once the item already exists. */
function WeightEditor({ value, onSave }: { value?: number; onSave: (weightPercent: number | null) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value !== undefined ? String(value) : "");

  if (!editing) {
    return (
      <button
        onClick={(e) => {
          e.stopPropagation();
          setDraft(value !== undefined ? String(value) : "");
          setEditing(true);
        }}
        className="inline-flex items-center gap-1 text-slate-400 hover:text-blue"
      >
        {value !== undefined ? `Weight ${value}%` : "Set weight"}
        <Pencil className="h-3 w-3" />
      </button>
    );
  }

  return (
    <span onClick={(e) => e.stopPropagation()} className="inline-flex items-center gap-1">
      <input
        type="number"
        min={0}
        step="0.5"
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        className="w-16 rounded border border-slate-200 px-1.5 py-0.5 text-xs outline-none focus:border-blue"
      />
      <button
        onClick={() => {
          onSave(draft.trim() ? Number(draft) : null);
          setEditing(false);
        }}
        className="text-mint"
        title="Save"
      >
        <Check className="h-3.5 w-3.5" />
      </button>
      <button onClick={() => setEditing(false)} className="text-slate-300" title="Cancel">
        <X className="h-3.5 w-3.5" />
      </button>
    </span>
  );
}

function GradingDefaultsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { gradingDefaults, setGradingDefaults } = useAppData();
  const [quizWeight, setQuizWeight] = useState("");
  const [examWeight, setExamWeight] = useState("");

  useEffect(() => {
    if (open) {
      setQuizWeight(gradingDefaults.quizWeight !== undefined ? String(gradingDefaults.quizWeight) : "");
      setExamWeight(gradingDefaults.examWeight !== undefined ? String(gradingDefaults.examWeight) : "");
    }
  }, [open, gradingDefaults.quizWeight, gradingDefaults.examWeight]);

  if (!open) return null;

  const save = () => {
    setGradingDefaults({
      quizWeight: quizWeight.trim() ? Number(quizWeight) : null,
      examWeight: examWeight.trim() ? Number(examWeight) : null,
    });
    onClose();
  };

  return (
    <Modal open onClose={onClose} title="Grading Defaults">
      <div className="space-y-3">
        <p className="text-xs text-slate-500">
          Pre-fills the weight field for every new quiz/exam you create — you can still change it per item.
        </p>
        <WeightField value={quizWeight} onChange={setQuizWeight} label="Default quiz weight (%)" />
        <WeightField value={examWeight} onChange={setExamWeight} label="Default exam weight (%)" />
        <button
          onClick={save}
          className="w-full rounded-lg bg-blue px-4 py-2.5 text-sm font-semibold text-white hover:brightness-95"
        >
          Save Defaults
        </button>
      </div>
    </Modal>
  );
}

function CreateQuizModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { addQuiz, realStudents, myTeacherClasses, classRoster, gradebookFeatureEnabled, gradingDefaults } =
    useAppData();
  const { profile } = useAuth();
  const isReal = isSupabaseConfigured && profile?.role === "teacher";
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [weightPercent, setWeightPercent] = useState("");
  const [questions, setQuestions] = useState<QuizQuestionDraft[]>([newQuestion()]);
  const [audienceMode, setAudienceMode] = useState<AudienceMode>("all");
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [classId, setClassId] = useState("");
  const [confirmed, setConfirmed] = useState(false);

  const selectedClassId = classId || myTeacherClasses[0]?.id || "";
  const classRosterStudents = isReal && selectedClassId ? classRoster(selectedClassId) : realStudents;

  useEffect(() => {
    if (open) setWeightPercent(gradingDefaults.quizWeight !== undefined ? String(gradingDefaults.quizWeight) : "");
  }, [open, gradingDefaults.quizWeight]);

  const reset = () => {
    setTitle("");
    setDueDate("");
    setWeightPercent("");
    setQuestions([newQuestion()]);
    setAudienceMode("all");
    setSelectedStudentIds([]);
    setClassId("");
    setConfirmed(false);
  };

  const updateQuestion = (id: string, patch: Partial<QuizQuestionDraft>) => {
    setQuestions((prev) => prev.map((q) => (q.id === id ? { ...q, ...patch } : q)));
  };

  const updateOption = (id: string, index: number, value: string) => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id !== id) return q;
        const options = [...q.options] as QuizQuestionDraft["options"];
        options[index] = value;
        return { ...q, options };
      }),
    );
  };

  const removeQuestion = (id: string) => {
    setQuestions((prev) => (prev.length > 1 ? prev.filter((q) => q.id !== id) : prev));
  };

  const toggleStudent = (id: string) => {
    setSelectedStudentIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const isValid =
    title.trim() &&
    dueDate &&
    questions.every((q) => q.text.trim() && q.options.every((o) => o.trim())) &&
    (audienceMode === "all" || selectedStudentIds.length > 0);

  const handleSubmit = () => {
    if (!isValid) return;
    const input: NewQuizInput = {
      title: title.trim(),
      classId: isReal ? selectedClassId || undefined : undefined,
      dueDate,
      questions: questions.map((q) => ({ id: q.id, text: q.text, options: q.options, correctIndex: q.correctIndex })),
      assignedStudentIds: audienceMode === "specific" ? selectedStudentIds : undefined,
      weightPercent: weightPercent.trim() ? Number(weightPercent) : undefined,
    };
    addQuiz(input);
    setConfirmed(true);
  };

  return (
    <Modal
      open={open}
      onClose={() => {
        onClose();
        reset();
      }}
      title="Create Quiz"
    >
      {confirmed ? (
        <div className="flex flex-col items-center text-center py-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-mint/10 text-mint mb-3">
            <FilePlus2 className="h-6 w-6" />
          </div>
          <p className="font-semibold text-slate-800">Quiz created</p>
          <p className="text-sm text-slate-500 mt-1">
            {questions.length} question{questions.length > 1 ? "s" : ""} sent to{" "}
            {audienceMode === "all" ? "every student" : `${selectedStudentIds.length} selected student(s)`}.
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
        <div className="space-y-3">
          <Field label="Quiz title">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Photosynthesis Quiz"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue"
            />
          </Field>
          <Field label="Due date">
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue"
            />
          </Field>
          {gradebookFeatureEnabled && <WeightField value={weightPercent} onChange={setWeightPercent} />}

          {isReal && myTeacherClasses.length > 1 && (
            <Field label="Class">
              <select
                value={selectedClassId}
                onChange={(e) => {
                  setClassId(e.target.value);
                  setSelectedStudentIds([]);
                }}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue"
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

          <div>
            <span className="block text-xs font-medium text-slate-500 mb-1">Send to</span>
            <div className="flex gap-2 mb-2">
              <button
                type="button"
                onClick={() => setAudienceMode("all")}
                className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-semibold border ${
                  audienceMode === "all" ? "bg-blue text-white border-blue" : "border-slate-200 text-slate-600"
                }`}
              >
                {isReal ? "Everyone in this class" : "All students"}
              </button>
              <button
                type="button"
                onClick={() => setAudienceMode("specific")}
                className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-semibold border ${
                  audienceMode === "specific" ? "bg-blue text-white border-blue" : "border-slate-200 text-slate-600"
                }`}
              >
                Specific students
              </button>
            </div>
            {audienceMode === "specific" && (
              <div className="rounded-lg border border-slate-200 max-h-40 overflow-y-auto divide-y divide-slate-100">
                {isReal && classRosterStudents.length === 0 && (
                  <p className="px-3 py-2 text-xs text-slate-400">No students in this class yet.</p>
                )}
                {(isReal ? classRosterStudents : [{ id: "amara-silva", name: "Amara Silva" }]).map((s) => (
                  <label
                    key={s.id}
                    className="flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedStudentIds.includes(s.id)}
                      onChange={() => toggleStudent(s.id)}
                      className="rounded border-slate-300"
                    />
                    {s.name}
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
            {questions.map((q, qi) => (
              <div key={q.id} className="rounded-lg border border-slate-200 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-slate-500">Question {qi + 1}</p>
                  <button
                    onClick={() => removeQuestion(q.id)}
                    className="text-slate-300 hover:text-red-500"
                    title="Remove question"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <input
                  value={q.text}
                  onChange={(e) => updateQuestion(q.id, { text: e.target.value })}
                  placeholder="Question text"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue"
                />
                <div className="space-y-1.5">
                  {q.options.map((opt, oi) => (
                    <div key={oi} className="flex items-center gap-2">
                      <button
                        onClick={() => updateQuestion(q.id, { correctIndex: oi })}
                        title="Mark as correct answer"
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${
                          q.correctIndex === oi
                            ? "bg-mint/10 border-mint/40 text-mint"
                            : "border-slate-200 text-slate-300"
                        }`}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      </button>
                      <input
                        value={opt}
                        onChange={(e) => updateOption(q.id, oi, e.target.value)}
                        placeholder={`Option ${oi + 1}`}
                        className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none focus:border-blue"
                      />
                    </div>
                  ))}
                </div>
                <p className="text-[11px] text-slate-400">Tap the circle next to the correct answer.</p>
              </div>
            ))}
          </div>

          <button
            onClick={() => setQuestions((prev) => [...prev, newQuestion()])}
            className="flex items-center gap-1.5 text-xs font-semibold text-blue hover:underline"
          >
            <Plus className="h-3.5 w-3.5" />
            Add question
          </button>

          <button
            onClick={handleSubmit}
            disabled={!isValid}
            className="w-full rounded-lg bg-blue px-4 py-2.5 text-sm font-semibold text-white hover:brightness-95 disabled:opacity-50"
          >
            Create Quiz
          </button>
        </div>
      )}
    </Modal>
  );
}

function ScheduleExamModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { addExam, realStudents, myTeacherClasses, classRoster, gradebookFeatureEnabled, gradingDefaults } =
    useAppData();
  const { profile } = useAuth();
  const isReal = isSupabaseConfigured && profile?.role === "teacher";
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [kind, setKind] = useState<ExamKind>("exam");
  const [detail, setDetail] = useState("");
  const [weightPercent, setWeightPercent] = useState("");
  const [audienceMode, setAudienceMode] = useState<AudienceMode>("all");
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [classId, setClassId] = useState("");
  const [confirmed, setConfirmed] = useState(false);

  const selectedClassId = classId || myTeacherClasses[0]?.id || "";
  const classRosterStudents = isReal && selectedClassId ? classRoster(selectedClassId) : realStudents;

  useEffect(() => {
    if (open) setWeightPercent(gradingDefaults.examWeight !== undefined ? String(gradingDefaults.examWeight) : "");
  }, [open, gradingDefaults.examWeight]);

  const reset = () => {
    setTitle("");
    setDate("");
    setKind("exam");
    setDetail("");
    setWeightPercent("");
    setAudienceMode("all");
    setSelectedStudentIds([]);
    setClassId("");
    setConfirmed(false);
  };

  const toggleStudent = (id: string) => {
    setSelectedStudentIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const isValid = title.trim() && date && (audienceMode === "all" || selectedStudentIds.length > 0);

  const handleSubmit = () => {
    if (!isValid) return;
    const input: NewExamInput = {
      title: title.trim(),
      classId: isReal ? selectedClassId || undefined : undefined,
      date,
      kind,
      detail: detail.trim() || undefined,
      assignedStudentIds: audienceMode === "specific" ? selectedStudentIds : undefined,
      weightPercent: weightPercent.trim() ? Number(weightPercent) : undefined,
    };
    addExam(input);
    setConfirmed(true);
  };

  return (
    <Modal
      open={open}
      onClose={() => {
        onClose();
        reset();
      }}
      title="Schedule Exam"
    >
      {confirmed ? (
        <div className="flex flex-col items-center text-center py-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-mint/10 text-mint mb-3">
            <CalendarClock className="h-6 w-6" />
          </div>
          <p className="font-semibold text-slate-800">Exam scheduled</p>
          <p className="text-sm text-slate-500 mt-1">
            Added to the calendar for {audienceMode === "all" ? "every student" : `${selectedStudentIds.length} selected student(s)`}.
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
        <div className="space-y-3">
          <Field label="Exam title">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Chapter 4 Midterm"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue"
            />
          </Field>
          <Field label="Date">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue"
            />
          </Field>
          <Field label="Type">
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value as ExamKind)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue"
            >
              <option value="exam">Exam</option>
              <option value="midterm">Midterm</option>
              <option value="final">Final</option>
              {gradebookFeatureEnabled && <option value="quiz">Quiz (paper)</option>}
            </select>
          </Field>
          {gradebookFeatureEnabled && <WeightField value={weightPercent} onChange={setWeightPercent} />}
          <Field label="Details (optional)">
            <input
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              placeholder="e.g. Covers chapters 1-4, bring a calculator"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue"
            />
          </Field>

          {isReal && myTeacherClasses.length > 1 && (
            <Field label="Class">
              <select
                value={selectedClassId}
                onChange={(e) => {
                  setClassId(e.target.value);
                  setSelectedStudentIds([]);
                }}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue"
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

          <div>
            <span className="block text-xs font-medium text-slate-500 mb-1">Applies to</span>
            <div className="flex gap-2 mb-2">
              <button
                type="button"
                onClick={() => setAudienceMode("all")}
                className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-semibold border ${
                  audienceMode === "all" ? "bg-blue text-white border-blue" : "border-slate-200 text-slate-600"
                }`}
              >
                {isReal ? "Everyone in this class" : "All students"}
              </button>
              <button
                type="button"
                onClick={() => setAudienceMode("specific")}
                className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-semibold border ${
                  audienceMode === "specific" ? "bg-blue text-white border-blue" : "border-slate-200 text-slate-600"
                }`}
              >
                Specific students
              </button>
            </div>
            {audienceMode === "specific" && (
              <div className="rounded-lg border border-slate-200 max-h-40 overflow-y-auto divide-y divide-slate-100">
                {isReal && classRosterStudents.length === 0 && (
                  <p className="px-3 py-2 text-xs text-slate-400">No students in this class yet.</p>
                )}
                {(isReal ? classRosterStudents : [{ id: "amara-silva", name: "Amara Silva" }]).map((s) => (
                  <label
                    key={s.id}
                    className="flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedStudentIds.includes(s.id)}
                      onChange={() => toggleStudent(s.id)}
                      className="rounded border-slate-300"
                    />
                    {s.name}
                  </label>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={handleSubmit}
            disabled={!isValid}
            className="w-full rounded-lg bg-blue px-4 py-2.5 text-sm font-semibold text-white hover:brightness-95 disabled:opacity-50"
          >
            Schedule Exam
          </button>
        </div>
      )}
    </Modal>
  );
}

function EnterGradesModal({
  exam,
  onClose,
}: {
  exam: TeacherExamSummary;
  onClose: () => void;
}) {
  const { setExamGrade, realStudents } = useAppData();
  const gradeByStudent = new Map(exam.grades.map((g) => [g.studentId, g]));
  const [drafts, setDrafts] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const s of realStudents) {
      const g = gradeByStudent.get(s.id);
      init[s.id] = g ? String(g.score) : "";
    }
    return init;
  });
  const [outOf, setOutOf] = useState("100");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    const parsedOutOf = Number(outOf) || 100;
    for (const s of realStudents) {
      const raw = drafts[s.id]?.trim();
      if (!raw) continue;
      const score = Number(raw);
      if (Number.isNaN(score)) continue;
      const existing = gradeByStudent.get(s.id);
      if (existing && existing.score === score && existing.outOf === parsedOutOf) continue;
      setExamGrade(exam.examId, s.id, score, parsedOutOf);
    }
    setSaving(false);
    onClose();
  };

  return (
    <Modal open onClose={onClose} title={`Enter Grades — ${exam.title}`}>
      <div className="space-y-3">
        <Field label="Out of (applies to every student below)">
          <input
            type="number"
            min={1}
            value={outOf}
            onChange={(e) => setOutOf(e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue"
          />
        </Field>
        <div className="max-h-72 overflow-y-auto rounded-lg border border-slate-200 divide-y divide-slate-100">
          {realStudents.length === 0 && (
            <p className="px-3 py-3 text-sm text-slate-400">No student accounts yet.</p>
          )}
          {realStudents.map((s) => (
            <div key={s.id} className="flex items-center gap-3 px-3 py-2">
              <p className="flex-1 min-w-0 truncate text-sm text-slate-700">{s.name}</p>
              <input
                type="number"
                value={drafts[s.id] ?? ""}
                onChange={(e) => setDrafts((prev) => ({ ...prev, [s.id]: e.target.value }))}
                placeholder="—"
                className="w-20 rounded-lg border border-slate-200 px-2 py-1.5 text-sm text-right outline-none focus:border-blue"
              />
            </div>
          ))}
        </div>
        <button
          onClick={save}
          disabled={saving || realStudents.length === 0}
          className="w-full rounded-lg bg-blue px-4 py-2.5 text-sm font-semibold text-white hover:brightness-95 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save Grades"}
        </button>
      </div>
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
