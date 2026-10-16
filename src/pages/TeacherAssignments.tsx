import { useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import {
  Archive,
  BarChart3,
  CheckSquare,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  FileText,
  Paperclip,
  Plus,
  X,
} from "lucide-react";
import { useAppData, type NewAssignmentInput } from "../store/AppDataContext";
import { useAuth } from "../store/AuthContext";
import { isSupabaseConfigured } from "../lib/supabaseClient";
import { teacherProfile } from "../data/mockData";
import Modal from "../components/Modal";
import { formatFullDate } from "../dateUtils";
import { statusConfig } from "../components/StatusControl";
import type { Attachment, Submission } from "../types";

export default function TeacherAssignments() {
  const { teacherAssignmentResults } = useAppData();
  const [createOpen, setCreateOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const totalAssignments = teacherAssignmentResults.length;
  const totalSubmissions = teacherAssignmentResults.reduce(
    (sum, a) => sum + a.submissions.filter((s) => s.status === "completed").length,
    0,
  );
  const totalAssigned = teacherAssignmentResults.reduce((sum, a) => sum + a.assignedCount, 0);
  const completionPct = totalAssigned === 0 ? null : Math.round((totalSubmissions / totalAssigned) * 100);

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-navy">
          <ClipboardList className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Assignments</h1>
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          className="flex items-center gap-1.5 rounded-lg bg-blue px-3.5 py-2 text-sm font-semibold text-white hover:brightness-95"
        >
          <Plus className="h-4 w-4" />
          Create Assignment
        </button>
      </header>

      {/* Stats + chart overview */}
      <section>
        <div className="grid grid-cols-3 gap-3 mb-3">
          <StatCard label="Assignments" value={String(totalAssignments)} />
          <StatCard label="Submissions" value={String(totalSubmissions)} />
          <StatCard label="Completion rate" value={completionPct === null ? "—" : `${completionPct}%`} />
        </div>

        {totalAssignments > 0 && (
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center gap-2 mb-3 text-navy">
              <BarChart3 className="h-4.5 w-4.5" />
              <p className="font-semibold text-sm">Completion rate by assignment</p>
            </div>
            <div className="space-y-2.5">
              {teacherAssignmentResults.map((a) => {
                const completed = a.submissions.filter((s) => s.status === "completed").length;
                const pct = a.assignedCount === 0 ? 0 : Math.round((completed / a.assignedCount) * 100);
                return (
                  <div key={a.assignmentId} className="flex items-center gap-3">
                    <p className="w-28 shrink-0 truncate text-xs text-slate-500">{a.title}</p>
                    <div className="flex-1 h-2.5 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          pct >= 85 ? "bg-mint" : pct >= 50 ? "bg-blue" : "bg-amber-500"
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="w-10 shrink-0 text-right text-xs font-semibold text-slate-600">{pct}%</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* Assignment list */}
      <section>
        <h2 className="font-bold text-lg text-navy mb-3">All Assignments</h2>
        {teacherAssignmentResults.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-400">
            No assignments yet — create one to get started.
          </div>
        ) : (
          <div className="space-y-2.5">
            {teacherAssignmentResults.map((a) => {
              const expanded = expandedId === a.assignmentId;
              const completed = a.submissions.filter((s) => s.status === "completed").length;
              return (
                <div key={a.assignmentId} className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                  <button
                    onClick={() => setExpandedId(expanded ? null : a.assignmentId)}
                    className="w-full flex items-center gap-3 p-4 text-left hover:bg-slate-50"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue/10 text-blue">
                      <ClipboardList className="h-4.5 w-4.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-800 truncate">{a.title}</p>
                      <p className="text-xs text-slate-400">
                        {a.subjectLabel} · Due {formatFullDate(a.dueDate)}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold text-slate-700">
                        {completed}/{a.assignedCount}
                      </p>
                      <p className="text-[11px] text-slate-400">completed</p>
                    </div>
                    {expanded ? (
                      <ChevronUp className="h-4 w-4 text-slate-400 shrink-0" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
                    )}
                  </button>
                  {expanded && (
                    <div className="border-t border-slate-100 divide-y divide-slate-50">
                      {a.submissions.map((s) => {
                        const cfg = statusConfig[s.status];
                        const StatusIcon = cfg.icon;
                        return (
                          <div key={s.studentId} className="px-4 py-2.5">
                            <div className="flex items-center justify-between text-sm">
                              <p className="text-slate-700">{s.studentName}</p>
                              <span
                                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${cfg.className}`}
                              >
                                <StatusIcon className="h-3 w-3" />
                                {cfg.label}
                              </span>
                            </div>
                            {s.submission && <SubmissionPreview submission={s.submission} />}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      <CreateAssignmentModal open={createOpen} onClose={() => setCreateOpen(false)} />
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

/** Read-only preview of what a student actually submitted — text, a photo, or a PDF. */
function SubmissionPreview({ submission }: { submission: Submission }) {
  if (submission.fileRemovedAt) {
    return (
      <p className="mt-1.5 flex items-start gap-1.5 text-xs text-slate-400">
        <Archive className="h-3.5 w-3.5 shrink-0 mt-0.5" />
        File removed on {formatFullDate(submission.fileRemovedAt.slice(0, 10))} to save storage.
      </p>
    );
  }
  if (submission.kind === "text") {
    return (
      <p className="mt-1.5 rounded-lg bg-slate-50 p-2.5 text-sm text-slate-700 whitespace-pre-wrap">
        {submission.textContent}
      </p>
    );
  }
  if (submission.fileType === "image" && submission.dataUrl) {
    return (
      <div className="mt-1.5 flex items-center gap-2">
        <img src={submission.dataUrl} alt="" className="h-16 w-16 rounded-lg object-cover border border-slate-200" />
        <p className="text-xs text-slate-500 truncate">{submission.fileName}</p>
      </div>
    );
  }
  if (submission.dataUrl) {
    return (
      <a
        href={submission.dataUrl}
        target="_blank"
        rel="noreferrer"
        className="mt-1.5 inline-flex items-center gap-1.5 rounded-lg bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-blue hover:bg-slate-100"
      >
        <FileText className="h-3.5 w-3.5" />
        {submission.fileName ?? "View file"}
      </a>
    );
  }
  return null;
}

const MAX_ATTACHMENT_SIZE = 3 * 1024 * 1024; // 3MB, keeps localStorage happy for this prototype
type AudienceMode = "all" | "specific";

function CreateAssignmentModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { addAssignment, realStudents, myTeacherClasses, classRoster } = useAppData();
  const { profile } = useAuth();
  const isReal = isSupabaseConfigured && profile?.role === "teacher";
  const [title, setTitle] = useState("");
  const [chapter, setChapter] = useState("");
  const [exercises, setExercises] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [submissionEnabled, setSubmissionEnabled] = useState(true);
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [audienceMode, setAudienceMode] = useState<AudienceMode>("all");
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [classId, setClassId] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedClassId = classId || myTeacherClasses[0]?.id || "";
  const classRosterStudents = isReal && selectedClassId ? classRoster(selectedClassId) : realStudents;

  const reset = () => {
    setTitle("");
    setChapter("");
    setExercises("");
    setDueDate("");
    setSubmissionEnabled(true);
    setAttachment(null);
    setFileError(null);
    setAudienceMode("all");
    setSelectedStudentIds([]);
    setClassId("");
    setConfirmed(false);
  };

  const toggleStudent = (id: string) => {
    setSelectedStudentIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleFile = (file: File) => {
    setFileError(null);
    const isPdf = file.type === "application/pdf";
    const isImage = file.type.startsWith("image/");
    if (!isPdf && !isImage) {
      setFileError("Please choose a PDF or image file.");
      return;
    }
    if (file.size > MAX_ATTACHMENT_SIZE) {
      setFileError("That file is too large — please choose one under 3MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setAttachment({
        id: `att-${Date.now()}`,
        type: isPdf ? "pdf" : "image",
        name: file.name,
        dataUrl: String(reader.result),
      });
    };
    reader.readAsDataURL(file);
  };

  const isValid = title.trim() && dueDate && (audienceMode === "all" || selectedStudentIds.length > 0);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    const input: NewAssignmentInput = {
      subjectId: teacherProfile.subjectId, // ignored server-side for real teachers; derived from their own profile
      classId: isReal ? selectedClassId || undefined : undefined,
      title: title.trim(),
      chapter: chapter.trim() || undefined,
      exercises: exercises.trim() || undefined,
      dueDate,
      submissionEnabled,
      attachments: attachment ? [attachment] : [],
      assignedStudentIds: audienceMode === "specific" ? selectedStudentIds : undefined,
    };
    addAssignment(input);
    setConfirmed(true);
  };

  return (
    <Modal
      open={open}
      onClose={() => {
        onClose();
        reset();
      }}
      title="Create Assignment"
    >
      {confirmed ? (
        <div className="flex flex-col items-center text-center py-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-mint/10 text-mint mb-3">
            <CheckSquare className="h-6 w-6" />
          </div>
          <p className="font-semibold text-slate-800">Assignment created</p>
          <p className="text-sm text-slate-500 mt-1">
            Sent to {audienceMode === "all" ? "every student" : `${selectedStudentIds.length} selected student(s)`}.
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
        <form onSubmit={handleSubmit} className="space-y-3">
          <Field label="Title">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="e.g. Ecosystems Worksheet"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Chapter">
              <input
                value={chapter}
                onChange={(e) => setChapter(e.target.value)}
                placeholder="Chapter 6"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue"
              />
            </Field>
            <Field label="Due date">
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue"
              />
            </Field>
          </div>
          <Field label="Exercises / instructions">
            <input
              value={exercises}
              onChange={(e) => setExercises(e.target.value)}
              placeholder="e.g. Label diagram + short answers"
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
              <div className="rounded-lg border border-slate-200 max-h-32 overflow-y-auto divide-y divide-slate-100">
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

          <Field label="Attach a worksheet or PDF (optional)">
            {attachment ? (
              <div className="flex items-center gap-2 rounded-lg border border-mint/30 bg-mint/5 px-3 py-2">
                {attachment.type === "image" ? (
                  <img src={attachment.dataUrl} alt="" className="h-8 w-8 rounded object-cover shrink-0" />
                ) : (
                  <FileText className="h-5 w-5 text-mint shrink-0" />
                )}
                <span className="min-w-0 flex-1 truncate text-sm text-slate-700">{attachment.name}</span>
                <button
                  type="button"
                  onClick={() => setAttachment(null)}
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-white hover:text-red-500"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-blue/40 bg-blue/5 px-3 py-2 text-xs font-semibold text-blue hover:bg-blue/10"
              >
                <Paperclip className="h-3.5 w-3.5" />
                Attach worksheet / PDF / image
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf,image/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
            {fileError && <p className="text-xs text-red-500 mt-1">{fileError}</p>}
          </Field>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={submissionEnabled}
              onChange={(e) => setSubmissionEnabled(e.target.checked)}
              className="rounded border-slate-300"
            />
            Allow students to submit their work in-app
          </label>
          <button
            type="submit"
            disabled={!isValid}
            className="w-full rounded-lg bg-blue px-4 py-2.5 text-sm font-semibold text-white hover:brightness-95 disabled:opacity-50"
          >
            Create Assignment
          </button>
        </form>
      )}
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
