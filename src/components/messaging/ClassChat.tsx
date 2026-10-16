import { useEffect, useState } from "react";
import { Lock, Megaphone, Pin } from "lucide-react";
import { useAppData } from "../../store/AppDataContext";
import { CURRENT_STUDENT_NAME, useMessaging } from "../../store/MessagingContext";
import { getSubjectIcon } from "../../subjectIcons";
import { formatMessageDay, formatMessageTime } from "../../dateUtils";
import AttachmentList from "../AttachmentList";
import PollCard from "./PollCard";
import ComposeBox from "./ComposeBox";
import ComposerNotice from "./ComposerNotice";
import type { ClassChannel } from "../../types";

export default function ClassChat() {
  const { getSubject } = useAppData();
  const { channels, getChannelMessages, postChannelMessage, votePoll, markChannelRead } =
    useMessaging();
  const [selectedId, setSelectedId] = useState(channels[0]?.id ?? "");
  const [showThreadOnMobile, setShowThreadOnMobile] = useState(false);

  const getDisplay = (c: ClassChannel) =>
    c.real
      ? { name: c.real.label, teacher: c.real.teacherName, color: c.real.color, icon: c.real.icon }
      : getSubject(c.subjectId);

  const channel = channels.find((c) => c.id === selectedId);
  const display = channel ? getDisplay(channel) : undefined;
  const messages = channel ? getChannelMessages(channel.id) : [];
  const pinned = messages.find((m) => m.pinned);

  useEffect(() => {
    if (selectedId) markChannelRead(selectedId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  return (
    <div className="flex h-full min-h-0 rounded-xl border border-slate-200 bg-white overflow-hidden">
      {/* Channel list */}
      <div
        className={`w-full md:w-72 shrink-0 border-r border-slate-200 overflow-y-auto ${
          showThreadOnMobile ? "hidden md:block" : "block"
        }`}
      >
        {channels.map((c) => {
          const s = getDisplay(c);
          if (!s) return null;
          const Icon = getSubjectIcon(s.icon);
          const isActive = c.id === selectedId;
          return (
            <button
              key={c.id}
              onClick={() => {
                setSelectedId(c.id);
                setShowThreadOnMobile(true);
              }}
              className={`flex w-full items-center gap-3 px-4 py-3 text-left border-b border-slate-100 ${
                isActive ? "bg-blue/5" : "hover:bg-slate-50"
              }`}
            >
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                style={{ backgroundColor: `${s.color}1A`, color: s.color }}
              >
                <Icon className="h-4.5 w-4.5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-800 truncate">
                  {s.name} — {c.section}
                </p>
                <p className="text-[11px] text-slate-400 flex items-center gap-1">
                  {c.mode === "closed" ? (
                    <>
                      <Lock className="h-3 w-3" /> Chat closed
                    </>
                  ) : c.mode === "teacher_only" ? (
                    <>
                      <Megaphone className="h-3 w-3" /> Announcements only
                    </>
                  ) : (
                    "Students can reply"
                  )}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Thread */}
      <div
        className={`flex-1 min-w-0 flex flex-col ${showThreadOnMobile ? "flex" : "hidden md:flex"}`}
      >
        {channel && display ? (
          <>
            <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-3">
              <button
                onClick={() => setShowThreadOnMobile(false)}
                className="md:hidden text-sm text-blue font-medium"
              >
                ← Back
              </button>
              <div className="min-w-0">
                <p className="font-semibold text-slate-800 truncate">
                  {display.name} — {channel.section}
                </p>
                <p className="text-xs text-slate-400">{display.teacher}</p>
              </div>
            </div>

            {pinned && (
              <div className="flex items-start gap-2 bg-amber-50 border-b border-amber-100 px-4 py-2.5 text-sm text-amber-800">
                <Pin className="h-4 w-4 mt-0.5 shrink-0" />
                <p>
                  <span className="font-semibold">Pinned:</span> {pinned.body}
                </p>
              </div>
            )}

            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
              {messages.map((m, i) => {
                const isMine = m.authorRole === "student" && m.authorName === CURRENT_STUDENT_NAME;
                const isTeacher = m.authorRole === "teacher";
                const prevDay = i > 0 ? formatMessageDay(messages[i - 1].timestamp) : null;
                const day = formatMessageDay(m.timestamp);
                return (
                  <div key={m.id}>
                    {day !== prevDay && (
                      <div className="text-center text-[11px] font-medium text-slate-400 my-3">
                        {day}
                      </div>
                    )}
                    <div className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[80%] ${isMine ? "items-end" : "items-start"} flex flex-col`}>
                        {!isMine && (
                          <p
                            className={`text-xs font-semibold mb-0.5 ${
                              isTeacher ? "text-navy" : "text-slate-500"
                            }`}
                          >
                            {m.authorName}
                            {isTeacher && " · Teacher"}
                          </p>
                        )}
                        <div
                          className={`rounded-2xl px-3.5 py-2 text-sm ${
                            isMine
                              ? "bg-blue text-white rounded-br-sm"
                              : isTeacher
                                ? "bg-navy/5 text-slate-800 rounded-bl-sm"
                                : "bg-slate-100 text-slate-800 rounded-bl-sm"
                          }`}
                        >
                          <p>{m.body}</p>
                          {m.attachments && m.attachments.length > 0 && (
                            <div className="mt-2">
                              <AttachmentList attachments={m.attachments} />
                            </div>
                          )}
                        </div>
                        {m.poll && (
                          <div className="w-full min-w-[240px]">
                            <PollCard
                              poll={m.poll}
                              onVote={(optId) => votePoll(m.id, optId)}
                              readOnly={channel.mode === "closed"}
                            />
                          </div>
                        )}
                        <p className="text-[10px] text-slate-400 mt-1">
                          {formatMessageTime(m.timestamp)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {channel.mode === "closed" ? (
              <ComposerNotice
                icon={Lock}
                text="This chat has been closed by your teacher. You can still view the message history."
              />
            ) : channel.mode === "teacher_only" ? (
              <ComposerNotice
                icon={Lock}
                text="This is an announcement-only channel — only your teacher can post here."
              />
            ) : (
              <ComposeBox onSend={(text) => postChannelMessage(channel.id, text)} />
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
            Select a class to view its chat.
          </div>
        )}
      </div>
    </div>
  );
}
