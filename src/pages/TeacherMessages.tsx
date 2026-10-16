import { useState } from "react";
import { Clock, MessageSquare } from "lucide-react";
import { useAuth } from "../store/AuthContext";
import { useMessaging } from "../store/MessagingContext";
import { isSupabaseConfigured } from "../lib/supabaseClient";
import { updateOfficeHours } from "../services/usersService";
import ComposeBox from "../components/messaging/ComposeBox";
import { MessageThread, EmptyThreadState } from "../components/messaging/ChatOversight";
import { formatMessageDay, formatMessageTime } from "../dateUtils";
import type { MessageAuthorRole } from "../types";

type Tab = "class" | "students" | "admin";

export default function TeacherMessages() {
  const [tab, setTab] = useState<Tab>("class");
  const [hoursOpen, setHoursOpen] = useState(false);
  const { profile } = useAuth();
  const isReal = isSupabaseConfigured && profile?.role === "teacher";

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] md:h-[calc(100vh-6rem)]">
      <header className="flex items-center justify-between gap-3 mb-4 shrink-0">
        <div className="flex items-center gap-2 text-navy">
          <MessageSquare className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Messages</h1>
        </div>
        {isReal && (
          <button
            onClick={() => setHoursOpen((v) => !v)}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:border-blue/40 hover:text-blue"
          >
            <Clock className="h-3.5 w-3.5" />
            Office Hours
          </button>
        )}
      </header>

      {isReal && hoursOpen && <OfficeHoursPanel onClose={() => setHoursOpen(false)} />}

      <div className="flex flex-wrap gap-2 mb-4 shrink-0">
        {(
          [
            { key: "class", label: "My Class" },
            { key: "students", label: "Students" },
            { key: "admin", label: "Admin" },
          ] as const
        ).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              tab === t.key
                ? "bg-navy text-white"
                : "bg-white text-slate-500 border border-slate-200 hover:border-navy/30"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 min-h-0">
        {tab === "class" && <MyClassChannel />}
        {tab === "students" && (
          <TeacherDMs filterRole="student" emptyText="No students yet — ask an admin to add one." />
        )}
        {tab === "admin" && <TeacherDMs filterRole="admin" emptyText="No admin account in your school yet." />}
      </div>
    </div>
  );
}

function OfficeHoursPanel({ onClose }: { onClose: () => void }) {
  const { profile } = useAuth();
  const [enabled, setEnabled] = useState(!!(profile?.office_hours_start && profile?.office_hours_end));
  const [start, setStart] = useState(profile?.office_hours_start?.slice(0, 5) ?? "08:00");
  const [end, setEnd] = useState(profile?.office_hours_end?.slice(0, 5) ?? "16:00");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    if (!profile) return;
    setSaving(true);
    setError(null);
    try {
      await updateOfficeHours(profile.id, enabled ? start : null, enabled ? end : null);
      onClose();
    } catch {
      setError("Couldn't save — check your connection and try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 mb-4 shrink-0">
      <div className="flex items-center justify-between mb-2">
        <p className="font-semibold text-slate-800 text-sm">When can students message you?</p>
        <label className="flex items-center gap-2 text-xs text-slate-500">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="rounded border-slate-300"
          />
          Restrict to specific hours
        </label>
      </div>
      {enabled ? (
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 text-sm text-slate-600">
            From
            <input
              type="time"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-blue"
            />
          </label>
          <label className="flex items-center gap-1.5 text-sm text-slate-600">
            To
            <input
              type="time"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-blue"
            />
          </label>
        </div>
      ) : (
        <p className="text-xs text-slate-400">Students can message you any time.</p>
      )}
      {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
      <div className="flex items-center gap-2 mt-3">
        <button
          onClick={save}
          disabled={saving}
          className="rounded-lg bg-blue px-3.5 py-1.5 text-xs font-semibold text-white hover:brightness-95 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save"}
        </button>
        <button onClick={onClose} className="rounded-lg px-3.5 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-100">
          Cancel
        </button>
      </div>
    </div>
  );
}

function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function MyClassChannel() {
  const { profile } = useAuth();
  const { channels, getChannelMessages, postChannelMessage } = useMessaging();
  const channel = channels.find((c) => c.real?.teacherId === profile?.id);

  if (!channel) {
    return <EmptyThreadState text="Your class channel isn't set up yet." />;
  }

  const messages = getChannelMessages(channel.id);

  return (
    <div className="flex h-full min-h-0 flex-col rounded-xl border border-slate-200 bg-white overflow-hidden">
      <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-3">
        <div className="min-w-0">
          <p className="font-semibold text-slate-800 truncate">{channel.real?.label ?? "My Class"}</p>
          <p className="text-xs text-slate-400">Broadcast to every student — they can reply here too.</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && (
          <p className="text-center text-sm text-slate-400 mt-6">No messages yet — say hello to your class.</p>
        )}
        {messages.map((m, i) => {
          const isMine = m.authorRole === "teacher";
          const prevDay = i > 0 ? formatMessageDay(messages[i - 1].timestamp) : null;
          const day = formatMessageDay(m.timestamp);
          return (
            <div key={m.id}>
              {day !== prevDay && (
                <div className="text-center text-[11px] font-medium text-slate-400 my-3">{day}</div>
              )}
              <div className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                <div className="max-w-[80%] flex flex-col">
                  {!isMine && (
                    <p className="text-xs font-semibold text-slate-500 mb-0.5">{m.authorName}</p>
                  )}
                  <div
                    className={`rounded-2xl px-3.5 py-2 text-sm ${
                      isMine ? "bg-blue text-white rounded-br-sm" : "bg-slate-100 text-slate-800 rounded-bl-sm"
                    }`}
                  >
                    {m.body}
                  </div>
                  <p className={`text-[10px] text-slate-400 mt-1 ${isMine ? "text-right" : ""}`}>
                    {formatMessageTime(m.timestamp)}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <ComposeBox onSend={(text) => postChannelMessage(channel.id, text)} />
    </div>
  );
}

function TeacherDMs({
  filterRole,
  emptyText,
}: {
  filterRole: MessageAuthorRole;
  emptyText: string;
}) {
  const { conversations, getConversationMessages, postDirectMessageAs, markConversationRead } = useMessaging();
  const threads = conversations.filter((c) => c.kind === "real-dm" && c.real?.otherUserRole === filterRole);
  const [selectedId, setSelectedId] = useState(threads[0]?.id ?? "");
  const [showThreadOnMobile, setShowThreadOnMobile] = useState(false);

  const conversation = threads.find((c) => c.id === selectedId);
  const messages = conversation ? getConversationMessages(conversation.id) : [];

  return (
    <div className="flex h-full min-h-0 rounded-xl border border-slate-200 bg-white overflow-hidden">
      <div
        className={`w-full md:w-72 shrink-0 border-r border-slate-200 overflow-y-auto ${
          showThreadOnMobile ? "hidden md:block" : "block"
        }`}
      >
        {threads.length === 0 && <p className="px-4 py-3 text-sm text-slate-400">{emptyText}</p>}
        {threads.map((c) => {
          const isActive = c.id === selectedId;
          const name = c.real?.otherUserName ?? "Unknown";
          return (
            <button
              key={c.id}
              onClick={() => {
                setSelectedId(c.id);
                setShowThreadOnMobile(true);
                markConversationRead(c.id);
              }}
              className={`flex w-full items-center gap-3 px-4 py-3 text-left border-b border-slate-100 ${
                isActive ? "bg-blue/5" : "hover:bg-slate-50"
              }`}
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-navy/10 text-navy font-semibold text-xs">
                {initials(name)}
              </div>
              <p className="text-sm font-semibold text-slate-800 truncate">{name}</p>
            </button>
          );
        })}
      </div>

      <div className={`flex-1 min-w-0 flex flex-col ${showThreadOnMobile ? "flex" : "hidden md:flex"}`}>
        {conversation ? (
          <>
            <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-3">
              <button
                onClick={() => setShowThreadOnMobile(false)}
                className="md:hidden text-sm text-blue font-medium"
              >
                ← Back
              </button>
              <p className="font-semibold text-slate-800 truncate">{conversation.real?.otherUserName}</p>
            </div>
            <MessageThread messages={messages} isMine={(m) => m.senderRole === "teacher"} />
            <ComposeBox onSend={(text) => postDirectMessageAs(conversation.id, "teacher", text)} />
          </>
        ) : (
          <EmptyThreadState text={`Select a conversation to message them.`} />
        )}
      </div>
    </div>
  );
}
