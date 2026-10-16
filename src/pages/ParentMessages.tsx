import { Heart, MessageSquare } from "lucide-react";
import ChatOversight from "../components/messaging/ChatOversight";
import { useAppData } from "../store/AppDataContext";
import { useAuth } from "../store/AuthContext";
import { isSupabaseConfigured } from "../lib/supabaseClient";

export default function ParentMessages() {
  const { riskSnapshots } = useAppData();
  const { profile } = useAuth();
  const isReal = isSupabaseConfigured && profile?.role === "parent";
  const childName = isReal ? riskSnapshots[0]?.studentName ?? "your child" : "Amara";

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] md:h-[calc(100vh-6rem)]">
      <header className="flex items-center gap-2 text-navy mb-1 shrink-0">
        <MessageSquare className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Family Messages</h1>
      </header>
      <p className="text-slate-500 mb-4 shrink-0">
        A read-only view of {childName}'s class chats and teacher conversations.
      </p>
      <div className="flex-1 min-h-0">
        <ChatOversight viewerLabel="Parent" viewerIcon={Heart} />
      </div>
    </div>
  );
}
