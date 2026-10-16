import { useState } from "react";
import { Eye, UserCog } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useAppData } from "../../store/AppDataContext";
import { useMessaging } from "../../store/MessagingContext";
import { getSubjectIcon } from "../../subjectIcons";
import { formatMessageDay, formatMessageTime } from "../../dateUtils";
import type { ClassChannel, Conversation, Subject } from "../../types";

function channelDisplay(c: ClassChannel, getSubject: (id: string) => Subject | undefined) {
  if (c.real) return { name: c.real.label, teacher: c.real.teacherName, color: c.real.color, icon: c.real.icon };
  return getSubject(c.subjectId);
}

function dmDisplay(c: Conversation, getSubject: (id: string) => Subject | undefined) {
  if (c.real)
    return {
      teacher: c.real.otherUserName,
      name: c.real.otherUserRole === "admin" ? "Admin" : "Teacher",
      student: c.real.observedStudentName,
    };
  const s = c.subjectId ? getSubject(c.subjectId) : undefined;
  return s ? { teacher: s.teacher, name: s.name, student: undefined } : null;
}

/** Read-only viewer for student class channels + teacher DMs — shared by Admin (all-school) and Parent (their child only). */
export default function ChatOversight({
  viewerLabel,
  viewerIcon: ViewerIcon,
}: {
  viewerLabel: string;
  viewerIcon: LucideIcon;
}) {
  const { getSubject } = useAppData();
  const { channels, oversightPairs, getChannelMessages, getConversationMessages } = useMessaging();
  const teacherDMs = oversightPairs.filter((c) => c.kind === "student-teacher" || c.kind === "real-dm");

  type Selection = { kind: "channel" | "dm"; id: string } | null;
  const [selected, setSelected] = useState<Selection>(channels[0] ? { kind: "channel", id: channels[0].id } : null);
  const [showThreadOnMobile, setShowThreadOnMobile] = useState(false);

  const channelMessages = selected?.kind === "channel" ? getChannelMessages(selected.id) : [];
  const dmMessages = selected?.kind === "dm" ? getConversationMessages(selected.id) : [];
  const selectedChannel = selected?.kind === "channel" ? channels.find((c) => c.id === selected.id) : undefined;
  const selectedDM = selected?.kind === "dm" ? teacherDMs.find((c) => c.id === selected.id) : undefined;
  const selectedChannelDisplay = selectedChannel ? channelDisplay(selectedChannel, getSubject) : undefined;
  const selectedDMDisplay = selectedDM ? dmDisplay(selectedDM, getSubject) : undefined;

  return (
    <div className="flex h-full min-h-0 rounded-xl border border-slate-200 bg-white overflow-hidden">
      <div
        className={`w-full md:w-72 shrink-0 border-r border-slate-200 overflow-y-auto ${
          showThreadOnMobile ? "hidden md:block" : "block"
        }`}
      >
        <p className="px-4 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          Class Channels
        </p>
        {channels.map((c) => {
          const s = channelDisplay(c, getSubject);
          if (!s) return null;
          const Icon = getSubjectIcon(s.icon);
          const isActive = selected?.kind === "channel" && selected.id === c.id;
          return (
            <button
              key={c.id}
              onClick={() => {
                setSelected({ kind: "channel", id: c.id });
                setShowThreadOnMobile(true);
              }}
              className={`flex w-full items-center gap-3 px-4 py-2.5 text-left border-b border-slate-50 ${
                isActive ? "bg-blue/5" : "hover:bg-slate-50"
              }`}
            >
              <div
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                style={{ backgroundColor: `${s.color}1A`, color: s.color }}
              >
                <Icon className="h-4 w-4" />
              </div>
              <p className="text-sm font-medium text-slate-700 truncate">
                {s.name} — {c.section}
              </p>
            </button>
          );
        })}

        <p className="px-4 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          Private Conversations
        </p>
        {teacherDMs.map((c) => {
          const s = dmDisplay(c, getSubject);
          if (!s) return null;
          const isActive = selected?.kind === "dm" && selected.id === c.id;
          return (
            <button
              key={c.id}
              onClick={() => {
                setSelected({ kind: "dm", id: c.id });
                setShowThreadOnMobile(true);
              }}
              className={`flex w-full items-center gap-3 px-4 py-2.5 text-left border-b border-slate-50 ${
                isActive ? "bg-blue/5" : "hover:bg-slate-50"
              }`}
            >
              <UserCog className="h-4 w-4 text-slate-400 shrink-0" />
              <p className="text-sm font-medium text-slate-700 truncate">
                {s.student ?? "Amara Silva"} ↔ {s.teacher}
              </p>
            </button>
          );
        })}
      </div>

      <div className={`flex-1 min-w-0 flex flex-col ${showThreadOnMobile ? "flex" : "hidden md:flex"}`}>
        {selected ? (
          <>
            <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-3">
              <button
                onClick={() => setShowThreadOnMobile(false)}
                className="md:hidden text-sm text-blue font-medium"
              >
                ← Back
              </button>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-slate-800 truncate">
                  {selectedChannel
                    ? `${selectedChannelDisplay?.name} — ${selectedChannel.section}`
                    : `${selectedDMDisplay?.student ?? "Amara Silva"} ↔ ${selectedDMDisplay?.teacher}`}
                </p>
              </div>
              <span className="flex items-center gap-1 text-[11px] font-semibold text-slate-400 shrink-0">
                <Eye className="h-3.5 w-3.5" />
                Read-only
              </span>
            </div>
            {selectedChannel ? (
              <ChannelTranscript messages={channelMessages} />
            ) : (
              <MessageThread messages={dmMessages} isMine={() => false} />
            )}
            <div className="border-t border-slate-100 px-4 py-2.5 text-xs text-slate-400 flex items-center gap-1.5">
              <ViewerIcon className="h-3.5 w-3.5" />
              Viewing as {viewerLabel} — you can see this chat but can't post in it.
            </div>
          </>
        ) : (
          <EmptyThreadState text="Select a chat to view it." />
        )}
      </div>
    </div>
  );
}

function ChannelTranscript({ messages }: { messages: ReturnType<typeof useMessaging>["channelMessages"] }) {
  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
      {messages.length === 0 && <p className="text-center text-sm text-slate-400 mt-6">No messages yet.</p>}
      {messages.map((m) => (
        <div key={m.id} className="text-sm">
          <p className="font-semibold text-slate-700">
            {m.authorName}
            {m.authorRole === "teacher" && " · Teacher"}
            <span className="ml-2 text-[11px] font-normal text-slate-400">{formatMessageTime(m.timestamp)}</span>
          </p>
          <p className="text-slate-600">{m.body}</p>
        </div>
      ))}
    </div>
  );
}

export function MessageThread({
  messages,
  isMine,
}: {
  messages: { id: string; body: string; timestamp: string; senderRole: string }[];
  isMine: (m: { senderRole: string }) => boolean;
}) {
  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
      {messages.length === 0 && <p className="text-center text-sm text-slate-400 mt-6">No messages yet.</p>}
      {messages.map((m, i) => {
        const mine = isMine(m);
        const prevDay = i > 0 ? formatMessageDay(messages[i - 1].timestamp) : null;
        const day = formatMessageDay(m.timestamp);
        return (
          <div key={m.id}>
            {day !== prevDay && (
              <div className="text-center text-[11px] font-medium text-slate-400 my-3">{day}</div>
            )}
            <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className="max-w-[80%] flex flex-col">
                <div
                  className={`rounded-2xl px-3.5 py-2 text-sm ${
                    mine ? "bg-blue text-white rounded-br-sm" : "bg-slate-100 text-slate-800 rounded-bl-sm"
                  }`}
                >
                  {m.body}
                </div>
                <p className={`text-[10px] text-slate-400 mt-1 ${mine ? "text-right" : ""}`}>
                  {formatMessageTime(m.timestamp)}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function EmptyThreadState({ text }: { text: string }) {
  return <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">{text}</div>;
}
