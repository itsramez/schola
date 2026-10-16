import { useState } from "react";
import { MessageSquare, ShieldCheck } from "lucide-react";
import { useAppData } from "../store/AppDataContext";
import { useMessaging } from "../store/MessagingContext";
import { studentsDirectory } from "../data/mockData";
import { getSubjectIcon } from "../subjectIcons";
import ComposeBox from "../components/messaging/ComposeBox";
import ChatOversight, { EmptyThreadState, MessageThread } from "../components/messaging/ChatOversight";
import type { Conversation, Subject } from "../types";

type Tab = "teachers" | "students" | "oversight";

function studentName(studentId?: string): string {
  return studentsDirectory.find((s) => s.id === studentId)?.name ?? "Student";
}

export default function AdminMessages() {
  const [tab, setTab] = useState<Tab>("teachers");

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] md:h-[calc(100vh-6rem)]">
      <header className="flex items-center gap-2 text-navy mb-4 shrink-0">
        <MessageSquare className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Messages</h1>
      </header>

      <div className="flex flex-wrap gap-2 mb-4 shrink-0">
        {(
          [
            { key: "teachers", label: "Message Teachers" },
            { key: "students", label: "Message Students" },
            { key: "oversight", label: "All School Chats" },
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
        {tab === "teachers" && <TeacherThreads />}
        {tab === "students" && <StudentThreads />}
        {tab === "oversight" && <ChatOversight viewerLabel="School Admin" viewerIcon={ShieldCheck} />}
      </div>
    </div>
  );
}

function teacherThreadDisplay(c: Conversation, getSubject: (id: string) => Subject | undefined) {
  if (c.real) return { teacher: c.real.otherUserName, name: "Teacher", color: "#2563EB", icon: "BookOpen" };
  return c.subjectId ? getSubject(c.subjectId) : undefined;
}

function TeacherThreads() {
  const { getSubject } = useAppData();
  const { conversations, getConversationMessages, postDirectMessageAs, markConversationRead } = useMessaging();
  const threads = conversations.filter(
    (c) => c.kind === "admin-teacher" || (c.kind === "real-dm" && c.real?.otherUserRole === "teacher"),
  );
  const [selectedId, setSelectedId] = useState(threads[0]?.id ?? "");
  const [showThreadOnMobile, setShowThreadOnMobile] = useState(false);

  const conversation = threads.find((c) => c.id === selectedId);
  const subject = conversation ? teacherThreadDisplay(conversation, getSubject) : undefined;
  const messages = conversation ? getConversationMessages(conversation.id) : [];

  return (
    <div className="flex h-full min-h-0 rounded-xl border border-slate-200 bg-white overflow-hidden">
      <div
        className={`w-full md:w-72 shrink-0 border-r border-slate-200 overflow-y-auto ${
          showThreadOnMobile ? "hidden md:block" : "block"
        }`}
      >
        {threads.map((c) => {
          const s = teacherThreadDisplay(c, getSubject);
          if (!s) return null;
          const Icon = getSubjectIcon(s.icon);
          const isActive = c.id === selectedId;
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
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                style={{ backgroundColor: `${s.color}1A`, color: s.color }}
              >
                <Icon className="h-4.5 w-4.5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-800 truncate">{s.teacher}</p>
                <p className="text-[11px] text-slate-400 truncate">{s.name}</p>
              </div>
            </button>
          );
        })}
      </div>

      <div className={`flex-1 min-w-0 flex flex-col ${showThreadOnMobile ? "flex" : "hidden md:flex"}`}>
        {conversation && subject ? (
          <>
            <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-3">
              <button
                onClick={() => setShowThreadOnMobile(false)}
                className="md:hidden text-sm text-blue font-medium"
              >
                ← Back
              </button>
              <div className="min-w-0">
                <p className="font-semibold text-slate-800 truncate">{subject.teacher}</p>
                <p className="text-xs text-slate-400">{subject.name}</p>
              </div>
            </div>
            <MessageThread messages={messages} isMine={(m) => m.senderRole === "admin"} />
            <ComposeBox onSend={(text) => postDirectMessageAs(conversation.id, "admin", text)} />
          </>
        ) : (
          <EmptyThreadState text="Select a teacher to message them." />
        )}
      </div>
    </div>
  );
}

function studentThreadName(c: Conversation): string {
  if (c.real) return c.real.otherUserName;
  return studentName(c.studentId);
}

function StudentThreads() {
  const { conversations, getConversationMessages, postDirectMessageAs, markConversationRead } = useMessaging();
  const threads = conversations.filter(
    (c) => c.kind === "admin-student" || (c.kind === "real-dm" && c.real?.otherUserRole === "student"),
  );
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
        {threads.map((c) => {
          const name = studentThreadName(c);
          const isActive = c.id === selectedId;
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
                {name
                  .split(" ")
                  .map((p) => p[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-800 truncate">{name}</p>
              </div>
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
              <p className="font-semibold text-slate-800 truncate">{studentThreadName(conversation)}</p>
            </div>
            <MessageThread messages={messages} isMine={(m) => m.senderRole === "admin"} />
            <ComposeBox onSend={(text) => postDirectMessageAs(conversation.id, "admin", text)} />
          </>
        ) : (
          <EmptyThreadState text="Select a student to message them." />
        )}
      </div>
    </div>
  );
}
