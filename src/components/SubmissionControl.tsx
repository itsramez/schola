import { useRef, useState } from "react";
import { Archive, CheckCircle2, FileText, PencilLine, RotateCcw, Send, X } from "lucide-react";
import type { Submission, SubmissionFileType } from "../types";
import { formatFullDate, nowLocalIso } from "../dateUtils";

const MAX_FILE_SIZE = 3 * 1024 * 1024; // 3MB, keeps localStorage happy for this prototype

interface SubmissionControlProps {
  submission?: Submission;
  onSubmit: (submission: Submission) => void;
  onClear: () => void;
}

export default function SubmissionControl({ submission, onSubmit, onClear }: SubmissionControlProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [writingText, setWritingText] = useState(false);
  const [textDraft, setTextDraft] = useState(submission?.textContent ?? "");

  const handleFile = (file: File) => {
    setError(null);
    const isPdf = file.type === "application/pdf";
    const isImage = file.type.startsWith("image/");
    if (!isPdf && !isImage) {
      setError("Please choose a photo or PDF file.");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setError("That file is too large — please choose one under 3MB.");
      return;
    }
    const fileType: SubmissionFileType = isPdf ? "pdf" : "image";
    const reader = new FileReader();
    reader.onload = () => {
      onSubmit({
        kind: "file",
        fileName: file.name,
        fileType,
        dataUrl: String(reader.result),
        submittedAt: nowLocalIso(),
      });
    };
    reader.readAsDataURL(file);
  };

  const submitText = () => {
    if (!textDraft.trim()) return;
    onSubmit({ kind: "text", textContent: textDraft.trim(), submittedAt: nowLocalIso() });
    setWritingText(false);
  };

  if (writingText) {
    return (
      <div className="rounded-lg border border-blue/30 bg-blue/5 p-3">
        <textarea
          value={textDraft}
          onChange={(e) => setTextDraft(e.target.value)}
          rows={4}
          autoFocus
          placeholder="Write your answer here…"
          className="w-full resize-none rounded-lg border border-slate-200 bg-white p-2.5 text-sm outline-none focus:border-blue"
        />
        <div className="flex items-center gap-2 mt-2">
          <button
            type="button"
            onClick={submitText}
            disabled={!textDraft.trim()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
          >
            <Send className="h-3.5 w-3.5" />
            Submit answer
          </button>
          <button
            type="button"
            onClick={() => {
              setWritingText(false);
              setTextDraft(submission?.textContent ?? "");
            }}
            className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-100"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  if (submission) {
    return (
      <div className="rounded-lg border border-mint/30 bg-mint/5 p-3">
        <div className="flex items-center gap-3">
          {submission.kind === "text" ? (
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-mint/10 text-mint">
              <PencilLine className="h-6 w-6" />
            </div>
          ) : submission.fileType === "image" && submission.dataUrl ? (
            <img
              src={submission.dataUrl}
              alt=""
              className="h-12 w-12 rounded-lg object-cover border border-mint/30 shrink-0"
            />
          ) : submission.fileRemovedAt ? (
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-400">
              <Archive className="h-6 w-6" />
            </div>
          ) : (
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-mint/10 text-mint">
              <FileText className="h-6 w-6" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-mint">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              Submitted
            </p>
            <p className="text-xs text-slate-500 truncate">
              {submission.kind === "text" ? "Text answer" : submission.fileName}
            </p>
            <p className="text-[11px] text-slate-400">
              {formatFullDate(submission.submittedAt.slice(0, 10))} ·{" "}
              {submission.submittedAt.slice(11, 16)}
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() =>
                submission.kind === "text" ? setWritingText(true) : inputRef.current?.click()
              }
              title="Replace submission"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-white hover:text-blue"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onClear}
              title="Remove submission"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-white hover:text-red-500"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        {submission.kind === "text" && (
          <p className="mt-2.5 pt-2.5 border-t border-mint/20 text-sm text-slate-700 whitespace-pre-wrap">
            {submission.textContent}
          </p>
        )}
        {submission.fileRemovedAt && (
          <p className="mt-2.5 pt-2.5 border-t border-slate-200 flex items-start gap-1.5 text-xs text-slate-400">
            <Archive className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            <span>
              Original file removed on {formatFullDate(submission.fileRemovedAt.slice(0, 10))} to save
              storage — your grade and feedback are preserved.
            </span>
          </p>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*,application/pdf"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-blue/40 bg-blue/5 px-3 py-2 text-xs font-semibold text-blue hover:bg-blue/10"
        >
          📎 Submit a photo or PDF
        </button>
        <button
          type="button"
          onClick={() => setWritingText(true)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-blue/40 bg-blue/5 px-3 py-2 text-xs font-semibold text-blue hover:bg-blue/10"
        >
          <PencilLine className="h-3.5 w-3.5" />
          Write a text answer
        </button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
      />
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}
