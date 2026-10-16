import { useState } from "react";
import type { FormEvent } from "react";
import { Megaphone, Plus } from "lucide-react";
import { useAppData, type NewAnnouncementInput } from "../store/AppDataContext";
import Modal from "../components/Modal";
import { formatFullDate } from "../dateUtils";
import type { AnnouncementAudienceType, AnnouncementCategory } from "../types";

const AUDIENCE_OPTIONS: { type: AnnouncementAudienceType; label: string }[] = [
  { type: "school", label: "Entire School" },
  { type: "grade", label: "Grade 9" },
  { type: "teachers", label: "All Teachers" },
  { type: "parents", label: "All Parents" },
];

const CATEGORY_OPTIONS: AnnouncementCategory[] = ["general", "academic", "event", "transport", "closure"];

const CATEGORY_STYLE: Record<AnnouncementCategory, string> = {
  general: "bg-slate-100 text-slate-600",
  academic: "bg-blue/10 text-blue",
  event: "bg-mint/10 text-mint",
  transport: "bg-amber-50 text-amber-600",
  closure: "bg-red-50 text-red-500",
};

export default function AdminAnnouncements() {
  const { announcements } = useAppData();
  const [createOpen, setCreateOpen] = useState(false);
  const sorted = [...announcements].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-navy">
          <Megaphone className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Announcements</h1>
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          className="flex items-center gap-1.5 rounded-lg bg-blue px-3.5 py-2 text-sm font-semibold text-white hover:brightness-95"
        >
          <Plus className="h-4 w-4" />
          New Announcement
        </button>
      </header>

      <section>
        {sorted.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-400">
            No announcements sent yet.
          </div>
        ) : (
          <div className="space-y-2.5">
            {sorted.map((a) => (
              <div key={a.id} className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between gap-3 mb-1">
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${CATEGORY_STYLE[a.category]}`}>
                      {a.category}
                    </span>
                    {a.important && (
                      <span className="rounded-full bg-red-50 text-red-500 px-2 py-0.5 text-[11px] font-semibold">
                        Important
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-slate-400 shrink-0">{formatFullDate(a.date)}</span>
                </div>
                <p className="font-semibold text-slate-800">{a.title}</p>
                <p className="text-sm text-slate-500 mt-0.5">{a.body}</p>
                <p className="text-xs text-slate-400 mt-1.5">To: {a.audience.label}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      <CreateAnnouncementModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}

function CreateAnnouncementModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { addAnnouncement } = useAppData();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [audienceType, setAudienceType] = useState<AnnouncementAudienceType>("school");
  const [category, setCategory] = useState<AnnouncementCategory>("general");
  const [important, setImportant] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const reset = () => {
    setTitle("");
    setBody("");
    setAudienceType("school");
    setCategory("general");
    setImportant(false);
    setConfirmed(false);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;
    const audienceOption = AUDIENCE_OPTIONS.find((o) => o.type === audienceType)!;
    const input: NewAnnouncementInput = {
      title: title.trim(),
      body: body.trim(),
      important,
      category,
      audience:
        audienceType === "grade"
          ? { type: "grade", label: audienceOption.label, grade: 9 }
          : { type: audienceType, label: audienceOption.label },
    };
    addAnnouncement(input);
    setConfirmed(true);
  };

  return (
    <Modal
      open={open}
      onClose={() => {
        onClose();
        reset();
      }}
      title="New Announcement"
    >
      {confirmed ? (
        <div className="flex flex-col items-center text-center py-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-mint/10 text-mint mb-3">
            <Megaphone className="h-6 w-6" />
          </div>
          <p className="font-semibold text-slate-800">Announcement sent</p>
          <p className="text-sm text-slate-500 mt-1">It's now live for the audience you selected.</p>
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
          <label className="block">
            <span className="block text-xs font-medium text-slate-500 mb-1">Title</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="e.g. Sports Day Schedule"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue"
            />
          </label>
          <label className="block">
            <span className="block text-xs font-medium text-slate-500 mb-1">Message</span>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              required
              rows={3}
              placeholder="Write your announcement…"
              className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue"
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="block text-xs font-medium text-slate-500 mb-1">Send to</span>
              <select
                value={audienceType}
                onChange={(e) => setAudienceType(e.target.value as AnnouncementAudienceType)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue"
              >
                {AUDIENCE_OPTIONS.map((o) => (
                  <option key={o.type} value={o.type}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="block text-xs font-medium text-slate-500 mb-1">Category</span>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as AnnouncementCategory)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue"
              >
                {CATEGORY_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {c.charAt(0).toUpperCase() + c.slice(1)}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={important}
              onChange={(e) => setImportant(e.target.checked)}
              className="rounded border-slate-300"
            />
            Mark as important
          </label>
          <button
            type="submit"
            className="w-full rounded-lg bg-blue px-4 py-2.5 text-sm font-semibold text-white hover:brightness-95"
          >
            Send Announcement
          </button>
        </form>
      )}
    </Modal>
  );
}
