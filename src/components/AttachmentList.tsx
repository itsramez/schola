import { Archive, FileText, Image, Link2, StickyNote, Video } from "lucide-react";
import type { Attachment, AttachmentType } from "../types";
import { formatFullDate } from "../dateUtils";

const attachmentIcons: Record<AttachmentType, typeof FileText> = {
  pdf: FileText,
  image: Image,
  video: Video,
  link: Link2,
  note: StickyNote,
};

const attachmentColors: Record<AttachmentType, string> = {
  pdf: "text-red-500 bg-red-50",
  image: "text-purple-500 bg-purple-50",
  video: "text-orange-500 bg-orange-50",
  link: "text-blue bg-blue-50",
  note: "text-mint bg-mint/10",
};

export default function AttachmentList({ attachments }: { attachments: Attachment[] }) {
  if (attachments.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {attachments.map((att) => {
        if (att.fileRemovedAt) {
          return (
            <span
              key={att.id}
              title={`Original file archived on ${formatFullDate(att.fileRemovedAt.slice(0, 10))} to save storage — the record is kept.`}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-medium text-slate-400"
            >
              <Archive className="h-3.5 w-3.5 shrink-0" />
              <span className="max-w-[180px] truncate">{att.name}</span>
              <span className="italic">(archived)</span>
            </span>
          );
        }
        const Icon = attachmentIcons[att.type];
        const className = `inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium ${attachmentColors[att.type]}`;
        const content = (
          <>
            <Icon className="h-3.5 w-3.5 shrink-0" />
            <span className="max-w-[180px] truncate">{att.name}</span>
          </>
        );
        return att.dataUrl ? (
          <a
            key={att.id}
            href={att.dataUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`${className} hover:brightness-95 cursor-pointer`}
          >
            {content}
          </a>
        ) : (
          <span key={att.id} className={className}>
            {content}
          </span>
        );
      })}
    </div>
  );
}
