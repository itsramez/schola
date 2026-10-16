import { useState } from "react";
import { CalendarClock, CheckCircle2, FileQuestion, Target, Trophy, XCircle } from "lucide-react";
import { useAppData } from "../store/AppDataContext";
import { formatFullDate } from "../dateUtils";
import type { ExamKind, Quiz } from "../types";

type Tab = "quizzes" | "exams";

const EXAM_KIND_LABEL: Record<ExamKind, string> = {
  quiz: "Quiz",
  midterm: "Midterm",
  final: "Final",
  exam: "Exam",
};

/** Σ(pct × weight) / Σ(weight) — matches the teacher's Gradebook formula. */
function weightedAverage(items: { pct: number; weight: number }[]): number | null {
  const totalWeight = items.reduce((sum, i) => sum + i.weight, 0);
  if (totalWeight <= 0) return null;
  return items.reduce((sum, i) => sum + i.pct * i.weight, 0) / totalWeight;
}

export default function StudentQuizzes() {
  const { quizzes, tests, gradebookFeatureEnabled } = useAppData();
  const [tab, setTab] = useState<Tab>("quizzes");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = quizzes.find((q) => q.id === selectedId);

  if (selected) {
    return selected.myAttempt ? (
      <QuizResult quiz={selected} onBack={() => setSelectedId(null)} />
    ) : (
      <TakeQuiz quiz={selected} onBack={() => setSelectedId(null)} />
    );
  }

  const taken = quizzes.filter((q) => q.myAttempt);
  const totalScore = taken.reduce((sum, q) => sum + (q.myAttempt?.score ?? 0), 0);
  const totalOutOf = taken.reduce((sum, q) => sum + (q.myAttempt?.outOf ?? 0), 0);
  const avgPct = totalOutOf === 0 ? 0 : Math.round((totalScore / totalOutOf) * 100);
  const completionPct = quizzes.length === 0 ? 0 : Math.round((taken.length / quizzes.length) * 100);

  const weightedItems = [
    ...quizzes
      .filter((q) => q.myAttempt && (q.myWeightPercent ?? q.weightPercent))
      .map((q) => ({ pct: (q.myAttempt!.score / q.myAttempt!.outOf) * 100, weight: (q.myWeightPercent ?? q.weightPercent)! })),
    ...tests
      .filter((t) => t.myGrade && (t.myWeightPercent ?? t.weightPercent))
      .map((t) => ({ pct: (t.myGrade!.score / t.myGrade!.outOf) * 100, weight: (t.myWeightPercent ?? t.weightPercent)! })),
  ];
  const overallWeightedPct = weightedAverage(weightedItems);

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] md:h-[calc(100vh-6rem)]">
      <header className="flex items-center gap-2 text-navy mb-1 shrink-0">
        <FileQuestion className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Testing</h1>
      </header>
      <p className="text-slate-500 mb-4 shrink-0">Your quizzes and how you're doing on them.</p>

      <div className="grid grid-cols-3 gap-3 mb-4 shrink-0">
        <StatCard icon={FileQuestion} label="Completed" value={`${taken.length}/${quizzes.length}`} />
        <StatCard icon={Trophy} label="Average Score" value={taken.length === 0 ? "—" : `${avgPct}%`} />
        {gradebookFeatureEnabled ? (
          <StatCard
            icon={Target}
            label="My Grade"
            value={overallWeightedPct === null ? "—" : `${Math.round(overallWeightedPct)}%`}
          />
        ) : (
          <StatCard icon={Target} label="Completion" value={`${completionPct}%`} />
        )}
      </div>

      {gradebookFeatureEnabled && (
        <div className="flex gap-2 mb-4 shrink-0">
          {(
            [
              { key: "quizzes", label: "Quizzes" },
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
      )}

      {tab === "exams" && gradebookFeatureEnabled ? (
        <div className="flex-1 min-h-0 overflow-y-auto space-y-3 pb-4">
          {tests.length === 0 && (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-400">
              No exams scheduled yet.
            </div>
          )}
          {tests.map((t) => (
            <div key={t.id} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                <CalendarClock className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-slate-800 truncate">{t.title}</p>
                <p className="text-xs text-slate-400">
                  {EXAM_KIND_LABEL[t.kind ?? "exam"]} · {formatFullDate(t.date)}
                  {t.myWeightPercent ?? t.weightPercent ? ` · Weight ${t.myWeightPercent ?? t.weightPercent}%` : ""}
                </p>
              </div>
              {t.myGrade ? (
                <span className="shrink-0 rounded-full bg-mint/10 text-mint text-xs font-semibold px-2.5 py-1">
                  {t.myGrade.score}/{t.myGrade.outOf}
                </span>
              ) : (
                <span className="shrink-0 rounded-full bg-amber-50 text-amber-600 text-xs font-semibold px-2.5 py-1">
                  Not graded yet
                </span>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="flex-1 min-h-0 overflow-y-auto space-y-3 pb-4">
          {quizzes.length === 0 && (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-400">
              No quizzes yet — your teacher hasn't posted one.
            </div>
          )}
          {quizzes.map((q) => (
            <button
              key={q.id}
              onClick={() => setSelectedId(q.id)}
              className="w-full flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 text-left hover:border-blue/40 hover:bg-blue/5 transition-colors"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue/10 text-blue">
                <FileQuestion className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-slate-800 truncate">{q.title}</p>
                <p className="text-xs text-slate-400">
                  {q.teacherName} · {q.subjectLabel} · {q.questions.length} question
                  {q.questions.length === 1 ? "" : "s"}
                  {q.dueDate ? ` · Due ${formatFullDate(q.dueDate)}` : ""}
                  {gradebookFeatureEnabled && (q.myWeightPercent ?? q.weightPercent)
                    ? ` · Weight ${q.myWeightPercent ?? q.weightPercent}%`
                    : ""}
                </p>
              </div>
              {q.myAttempt ? (
                <span className="shrink-0 rounded-full bg-mint/10 text-mint text-xs font-semibold px-2.5 py-1">
                  {q.myAttempt.score}/{q.myAttempt.outOf}
                </span>
              ) : (
                <span className="shrink-0 rounded-full bg-amber-50 text-amber-600 text-xs font-semibold px-2.5 py-1">
                  Not taken
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof FileQuestion;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3.5">
      <div className="flex items-center gap-1.5 text-slate-400 mb-1.5">
        <Icon className="h-3.5 w-3.5" />
        <span className="text-xs font-medium">{label}</span>
      </div>
      <p className="text-xl font-bold text-navy">{value}</p>
    </div>
  );
}

function TakeQuiz({ quiz, onBack }: { quiz: Quiz; onBack: () => void }) {
  const { submitQuizAnswers } = useAppData();
  const [answers, setAnswers] = useState<(number | null)[]>(() => quiz.questions.map(() => null));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allAnswered = answers.every((a) => a !== null);

  const submit = async () => {
    if (!allAnswered || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await submitQuizAnswers(quiz.id, answers as number[]);
    } catch {
      setError("Couldn't submit your answers — check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto space-y-4 pb-4">
      <button onClick={onBack} className="text-xs font-semibold text-blue hover:underline">
        ← Back to quizzes
      </button>
      <div>
        <h2 className="text-lg font-bold text-navy">{quiz.title}</h2>
        <p className="text-sm text-slate-500">
          {quiz.teacherName} · {quiz.subjectLabel}
        </p>
      </div>

      <div className="space-y-3">
        {quiz.questions.map((q, qi) => (
          <div key={q.id} className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="font-medium text-slate-800 mb-3">
              {qi + 1}. {q.text}
            </p>
            <div className="space-y-2">
              {q.options.map((opt, oi) => (
                <button
                  key={oi}
                  onClick={() => setAnswers((prev) => prev.map((a, i) => (i === qi ? oi : a)))}
                  className={`w-full flex items-center gap-2.5 rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                    answers[qi] === oi
                      ? "border-blue bg-blue/5 text-navy font-medium"
                      : "border-slate-200 text-slate-600 hover:border-slate-300"
                  }`}
                >
                  <span
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${
                      answers[qi] === oi ? "border-blue bg-blue" : "border-slate-300"
                    }`}
                  >
                    {answers[qi] === oi && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                  </span>
                  {opt}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}
      <button
        onClick={submit}
        disabled={!allAnswered || submitting}
        className="w-full rounded-lg bg-blue px-4 py-2.5 text-sm font-semibold text-white hover:brightness-95 disabled:opacity-50"
      >
        {submitting ? "Submitting…" : "Submit Quiz"}
      </button>
    </div>
  );
}

function QuizResult({ quiz, onBack }: { quiz: Quiz; onBack: () => void }) {
  const attempt = quiz.myAttempt!;
  const pct = quiz.questions.length === 0 ? 0 : Math.round((attempt.score / attempt.outOf) * 100);

  return (
    <div className="h-full overflow-y-auto space-y-4 pb-4">
      <button onClick={onBack} className="text-xs font-semibold text-blue hover:underline">
        ← Back to quizzes
      </button>
      <div className="rounded-xl border border-slate-200 bg-white p-5 text-center">
        <p className="text-sm text-slate-500">{quiz.title}</p>
        <p className="text-3xl font-bold text-navy mt-1">
          {attempt.score}/{attempt.outOf}
        </p>
        <p className="text-sm text-slate-400 mt-0.5">{pct}%</p>
      </div>

      <div className="space-y-3">
        {quiz.questions.map((q, qi) => {
          const myAnswer = attempt.answers[qi];
          const correct = myAnswer === q.correctIndex;
          return (
            <div key={q.id} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-start gap-2 mb-3">
                {correct ? (
                  <CheckCircle2 className="h-4.5 w-4.5 text-mint shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="h-4.5 w-4.5 text-red-500 shrink-0 mt-0.5" />
                )}
                <p className="font-medium text-slate-800">
                  {qi + 1}. {q.text}
                </p>
              </div>
              <div className="space-y-1.5 pl-7">
                {q.options.map((opt, oi) => {
                  const isCorrectOption = oi === q.correctIndex;
                  const isMyAnswer = oi === myAnswer;
                  return (
                    <p
                      key={oi}
                      className={`text-sm rounded-lg px-3 py-1.5 ${
                        isCorrectOption
                          ? "bg-mint/10 text-mint font-medium"
                          : isMyAnswer
                            ? "bg-red-50 text-red-500"
                            : "text-slate-500"
                      }`}
                    >
                      {opt}
                      {isCorrectOption && " ✓"}
                      {isMyAnswer && !isCorrectOption && " (your answer)"}
                    </p>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
