import { useState } from "react";
import { MessageSquare } from "lucide-react";
import ClassChat from "../components/messaging/ClassChat";
import DirectMessages from "../components/messaging/DirectMessages";
import AdminMessages from "./AdminMessages";
import ParentMessages from "./ParentMessages";
import TeacherMessages from "./TeacherMessages";
import { useRole } from "../store/RoleContext";

type Tab = "class" | "direct";

export default function Messages() {
  const { role } = useRole();
  const [tab, setTab] = useState<Tab>("class");

  if (role === "admin") return <AdminMessages />;
  if (role === "parent") return <ParentMessages />;
  if (role === "teacher") return <TeacherMessages />;

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] md:h-[calc(100vh-6rem)]">
      <header className="flex items-center gap-2 text-navy mb-4 shrink-0">
        <MessageSquare className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Messages</h1>
      </header>

      <div className="flex gap-2 mb-4 shrink-0">
        <button
          onClick={() => setTab("class")}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            tab === "class"
              ? "bg-navy text-white"
              : "bg-white text-slate-500 border border-slate-200 hover:border-navy/30"
          }`}
        >
          Class Chat
        </button>
        <button
          onClick={() => setTab("direct")}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
            tab === "direct"
              ? "bg-navy text-white"
              : "bg-white text-slate-500 border border-slate-200 hover:border-navy/30"
          }`}
        >
          Private Messages
        </button>
      </div>

      <div className="flex-1 min-h-0">{tab === "class" ? <ClassChat /> : <DirectMessages />}</div>
    </div>
  );
}
