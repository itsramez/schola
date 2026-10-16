import { useMemo, useState } from "react";
import { NotebookPen } from "lucide-react";
import { useAppData } from "../store/AppDataContext";
import { getSubjectIcon } from "../subjectIcons";
import { formatDueLabel, isPast } from "../dateUtils";
import StatusControl from "../components/StatusControl";
import AttachmentList from "../components/AttachmentList";
import SubmissionControl from "../components/SubmissionControl";
import TeacherReviewCard from "../components/TeacherReviewCard";
import type { AssignmentStatus } from "../types";

type FilterKey = "all" | AssignmentStatus;

const filters: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "not_started", label: "Not Started" },
  { key: "in_progress", label: "In Progress" },
  { key: "completed", label: "Completed" },
];

export default function Agenda() {
  const { subjects, classes, assignments, setAssignmentStatus, submitAssignmentWork, clearAssignmentSubmission } =
    useAppData();
  const [filter, setFilter] = useState<FilterKey>("all");

  // Group by class when an assignment carries one — a teacher with several classes (even ones
  // that share a subject name) gets them kept separate, instead of collapsing into one bucket.
  // Falls back to subject.id for mock/demo assignments and any pre-migration rows without a class.
  const grouped = useMemo(() => {
    const buckets = new Map<
      string,
      { key: string; label: string; teacherName: string; icon: string; color: string; items: typeof assignments }
    >();
    for (const a of assignments) {
      if (filter !== "all" && a.status !== filter) continue;
      const cls = a.classId ? classes.find((c) => c.id === a.classId) : undefined;
      const subject = subjects.find((s) => s.id === a.subjectId);
      const label = cls?.subjectName ?? subject?.name ?? "Class";
      const key = a.classId ?? a.subjectId;
      if (!buckets.has(key)) {
        buckets.set(key, {
          key,
          label,
          teacherName: cls?.teacherName ?? subject?.teacher ?? "",
          icon: subject?.icon ?? subjects.find((s) => s.name.toLowerCase() === label.toLowerCase())?.icon ?? "BookOpen",
          color: subject?.color ?? "#2563EB",
          items: [],
        });
      }
      buckets.get(key)!.items.push(a);
    }
    return Array.from(buckets.values())
      .map((b) => ({ ...b, items: [...b.items].sort((a, b2) => a.dueDate.localeCompare(b2.dueDate)) }))
      .filter((b) => b.items.length > 0);
  }, [subjects, classes, assignments, filter]);

  return (
    <div className="space-y-6">
      <header>
        <div className="flex items-center gap-2 text-navy">
          <NotebookPen className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Digital Agenda</h1>
        </div>
        <p className="text-slate-500 mt-1">
          Tap a status pill to move an assignment forward — Not Started → In Progress → Completed.
        </p>
      </header>

      <div className="flex flex-wrap gap-2">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
              filter === f.key
                ? "bg-navy text-white"
                : "bg-white text-slate-500 border border-slate-200 hover:border-navy/30"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {grouped.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-400">
          No assignments match this filter.
        </div>
      )}

      <div className="space-y-8">
        {grouped.map(({ key, label, teacherName, icon, color, items }) => {
          const Icon = getSubjectIcon(icon);
          return (
            <section key={key}>
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-lg"
                  style={{ backgroundColor: `${color}1A`, color }}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-bold text-slate-800">{label}</h2>
                  <p className="text-xs text-slate-400">{teacherName}</p>
                </div>
              </div>

              <div className="space-y-3">
                {items.map((item) => {
                  const overdue = isPast(item.dueDate) && item.status !== "completed";
                  return (
                    <div
                      key={item.id}
                      className="rounded-xl border bg-white p-4 space-y-3"
                      style={{ borderColor: overdue ? "#fecaca" : "#e2e8f0" }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-800">{item.title}</p>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-sm text-slate-500">
                            {item.chapter && <span>📖 {item.chapter}</span>}
                            {item.exercises && <span>📝 {item.exercises}</span>}
                            <span className={overdue ? "text-red-500 font-medium" : ""}>
                              📅 Due: {formatDueLabel(item.dueDate)}
                            </span>
                          </div>
                        </div>
                        <StatusControl
                          status={item.status}
                          onChange={(s) => setAssignmentStatus(item.id, s)}
                        />
                      </div>

                      {item.attachments.length > 0 && (
                        <div className="pt-2 border-t border-slate-100">
                          <p className="text-xs font-medium text-slate-400 mb-1.5">
                            Attached by {teacherName}
                          </p>
                          <AttachmentList attachments={item.attachments} />
                        </div>
                      )}

                      <div className="pt-2 border-t border-slate-100">
                        <p className="text-xs font-medium text-slate-400 mb-1.5">Your work</p>
                        {item.submissionEnabled ? (
                          <SubmissionControl
                            submission={item.submission}
                            onSubmit={(s) => submitAssignmentWork(item.id, s)}
                            onClear={() => clearAssignmentSubmission(item.id)}
                          />
                        ) : (
                          <p className="text-xs text-slate-400 italic">
                            Submissions aren't enabled for this assignment — your teacher will
                            collect this one in class.
                          </p>
                        )}
                      </div>

                      {item.review && (
                        <div className="pt-2 border-t border-slate-100">
                          <TeacherReviewCard review={item.review} teacher={teacherName} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
