import { useEffect, useState } from "react";
import { Archive, Clock, ShieldCheck, ShieldOff, UserCog } from "lucide-react";
import { useAppData } from "../../store/AppDataContext";
import { useMessaging } from "../../store/MessagingContext";
import { CURRENT_STUDENT_ID } from "../../data/mockData";
import { getSubjectIcon } from "../../subjectIcons";
import { currentTimeHHMM, formatMessageDay, formatMessageTime, isWithinHours } from "../../dateUtils";
import type { Conversation, Subject } from "../../types";
import ComposeBox from "./ComposeBox";
import ComposerNotice from "./ComposerNotice";

function conversationDisplay(c: Conversation, getSubject: (id: string) => Subject | undefined) {
  if (c.real) {
    return {
      title: c.real.otherUserName,
      subtitle: c.real.otherUserRole === "admin" ? "School Administration" : "Teacher",
      Icon: c.real.otherUserRole === "admin" ? ShieldCheck : UserCog,
      color: "#2563EB",
    };
  }
  if (c.kind === "admin-student") {
    return { title: "School Administration", subtitle: "Admin office", Icon: ShieldCheck, color: "#172554" };
  }
  const subject = c.subjectId ? getSubject(c.subjectId) : undefined;
  if (!subject) return null;
  return { title: subject.teacher, subtitle: subject.name, Icon: getSubjectIcon(subject.icon), color: subject.color };
}

export default function DirectMessages() {
  const { getSubject } = useAppData();
  const {
    conversations: allConversations,
    communicationHours,
    getConversationMessages,
    postDirectMessage,
    markConversationRead,
  } = useMessaging();

  const conversations = allConversations.filter(
    (c) =>
      c.kind === "student-teacher" ||
      c.kind === "real-dm" ||
      (c.kind === "admin-student" && c.studentId === CURRENT_STUDENT_ID),
  );

  const [selectedId, setSelectedId] = useState(conversations[0]?.id ?? "");
  const [showThreadOnMobile, setShowThreadOnMobile] = useState(false);

  const conversation = conversations.find((c) => c.id === selectedId);
  const display = conversation ? conversationDisplay(conversation, getSubject) : null;
  const messages = conversation ? getConversationMessages(conversation.id) : [];
  const officeHours = conversation?.real?.officeHours ?? (conversation?.real ? null : communicationHours);
  const withinHours = !officeHours || isWithinHours(currentTimeHHMM(), officeHours.start, officeHours.end);

  useEffect(() => {
    if (selectedId) markConversationRead(selectedId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  return (
    <div className="flex h-full min-h-0 flex-col rounded-xl border border-slate-200 bg-white overflow-hidden">
      <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-4 py-2 text-xs text-slate-500">
        <Archive className="h-3.5 w-3.5 shrink-0" />
        Messages are archived for record-keeping. Nothing here can be deleted.
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Conversation list */}
        <div
          className={`w-full md:w-72 shrink-0 border-r border-slate-200 overflow-y-auto ${
            showThreadOnMobile ? "hidden md:block" : "block"
          }`}
        >
          {conversations.map((c) => {
            const d = conversationDisplay(c, getSubject);
            if (!d) return null;
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
                  style={{ backgroundColor: `${d.color}1A`, color: d.color }}
                >
                  <d.Icon className="h-4.5 w-4.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-800 truncate">{d.title}</p>
                  <p className="text-[11px] text-slate-400 truncate">{d.subtitle}</p>
                </div>
                {c.dmDisabled && <ShieldOff className="h-3.5 w-3.5 text-slate-300 shrink-0" />}
              </button>
            );
          })}
        </div>

        {/* Thread */}
        <div
          className={`flex-1 min-w-0 flex flex-col ${showThreadOnMobile ? "flex" : "hidden md:flex"}`}
        >
          {conversation && display ? (
            <>
              <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-3">
                <button
                  onClick={() => setShowThreadOnMobile(false)}
                  className="md:hidden text-sm text-blue font-medium"
                >
                  ← Back
                </button>
                <div className="min-w-0">
                  <p className="font-semibold text-slate-800 truncate">{display.title}</p>
                  <p className="text-xs text-slate-400">{display.subtitle}</p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
                {messages.length === 0 && (
                  <p className="text-center text-sm text-slate-400 mt-6">
                    No messages yet. Say hello!
                  </p>
                )}
                {messages.map((m, i) => {
                  const isMine = m.senderRole === "student";
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
                        <div className="max-w-[80%] flex flex-col">
                          {!isMine && conversation.kind === "admin-student" && (
                            <p className="text-xs font-semibold text-navy mb-0.5">School Administration</p>
                          )}
                          <div
                            className={`rounded-2xl px-3.5 py-2 text-sm ${
                              isMine
                                ? "bg-blue text-white rounded-br-sm"
                                : "bg-slate-100 text-slate-800 rounded-bl-sm"
                            }`}
                          >
                            {m.body}
                          </div>
                          <p
                            className={`text-[10px] text-slate-400 mt-1 ${isMine ? "text-right" : ""}`}
                          >
                            {formatMessageTime(m.timestamp)}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {conversation.dmDisabled ? (
                <ComposerNotice
                  icon={ShieldOff}
                  text={`${display.title} has turned off private messaging for this class. Please use the class chat or contact the school office.`}
                />
              ) : !withinHours && officeHours ? (
                <ComposerNotice
                  icon={Clock}
                  text={`${display.title} is available for messages ${officeHours.start.slice(0, 5)}–${officeHours.end.slice(0, 5)}.`}
                />
              ) : (
                <ComposeBox onSend={(text) => postDirectMessage(conversation.id, text)} />
              )}
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
              Select a conversation to view your messages.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
