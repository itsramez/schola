import { useMemo } from "react";
import { Award, ClipboardList, RotateCcw } from "lucide-react";
import { useAppData } from "../store/AppDataContext";
import { formatDueLabel, isPast } from "../dateUtils";
import StatusControl from "../components/StatusControl";
import SubmissionControl from "../components/SubmissionControl";
import TeacherReviewCard from "../components/TeacherReviewCard";
import AttachmentList from "../components/AttachmentList";

export default function Assignments() {
  const { assignments, getSubject, setAssignmentStatus, submitAssignmentWork, clearAssignmentSubmission } =
    useAppData();

  const sorted = useMemo(
    () => [...assignments].sort((a, b) => a.dueDate.localeCompare(b.dueDate)),
    [assignments],
  );

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-2 text-navy">
        <ClipboardList className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Assignments</h1>
      </header>
      <p className="text-slate-500 -mt-4">All assignments across every subject, soonest first.</p>

      <div className="space-y-3">
        {sorted.map((a) => {
          const subject = getSubject(a.subjectId);
          const overdue = isPast(a.dueDate) && a.status !== "completed";
          return (
            <div
              key={a.id}
              className="rounded-xl border bg-white p-3.5 space-y-3"
              style={{ borderColor: overdue ? "#fecaca" : "#e2e8f0" }}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold" style={{ color: subject?.color }}>
                    {subject?.name}
                  </p>
                  <p className="font-medium text-slate-800 truncate">{a.title}</p>
                  <p
                    className={`text-xs mt-0.5 ${overdue ? "text-red-500 font-medium" : "text-slate-400"}`}
                  >
                    Due {formatDueLabel(a.dueDate)}
                  </p>
                  {a.review && (
                    <p
                      className={`flex items-center gap-1 text-xs font-medium mt-1 ${
                        a.review.status === "resubmit" ? "text-amber-600" : "text-mint"
                      }`}
                    >
                      {a.review.status === "resubmit" ? (
                        <>
                          <RotateCcw className="h-3 w-3" /> Resubmission requested
                        </>
                      ) : (
                        <>
                          <Award className="h-3 w-3" /> Graded
                          {a.review.score !== undefined && ` · ${a.review.score}/${a.review.outOf}`}
                        </>
                      )}
                    </p>
                  )}
                </div>
                <StatusControl status={a.status} onChange={(s) => setAssignmentStatus(a.id, s)} />
              </div>

              {a.attachments.length > 0 && (
                <div className="pt-2 border-t border-slate-100">
                  <p className="text-xs font-medium text-slate-400 mb-1.5">
                    Attached by {subject?.teacher}
                  </p>
                  <AttachmentList attachments={a.attachments} />
                </div>
              )}

              <div className="pt-2 border-t border-slate-100">
                <p className="text-xs font-medium text-slate-400 mb-1.5">Your work</p>
                {a.submissionEnabled ? (
                  <SubmissionControl
                    submission={a.submission}
                    onSubmit={(s) => submitAssignmentWork(a.id, s)}
                    onClear={() => clearAssignmentSubmission(a.id)}
                  />
                ) : (
                  <p className="text-xs text-slate-400 italic">
                    Submissions aren't enabled for this assignment — your teacher will collect this
                    one in class.
                  </p>
                )}
              </div>

              {a.review && (
                <TeacherReviewCard review={a.review} teacher={subject?.teacher ?? "Your teacher"} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
