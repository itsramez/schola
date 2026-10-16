import { supabase } from "../lib/supabaseClient";

export interface RawMessage {
  id: string;
  channel_id: string | null;
  sender_id: string;
  recipient_id: string | null;
  body: string;
  created_at: string;
}

export async function fetchChannelMessages(channelId: string): Promise<RawMessage[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("channel_id", channelId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return data as RawMessage[];
}

export async function fetchDirectMessages(userA: string, userB: string): Promise<RawMessage[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .is("channel_id", null)
    .or(`and(sender_id.eq.${userA},recipient_id.eq.${userB}),and(sender_id.eq.${userB},recipient_id.eq.${userA})`)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return data as RawMessage[];
}

export async function sendMessage(input: {
  channelId?: string;
  senderId: string;
  recipientId?: string;
  body: string;
}): Promise<RawMessage> {
  if (!supabase) throw new Error("Supabase is not configured");
  const { data, error } = await supabase
    .from("messages")
    .insert([
      {
        channel_id: input.channelId ?? null,
        sender_id: input.senderId,
        recipient_id: input.recipientId ?? null,
        body: input.body,
      },
    ])
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as RawMessage;
}

/** Subscribes to every new message in real time. Filtering to "is this relevant to me" happens in the caller. */
export function subscribeToMessages(onInsert: (m: RawMessage) => void): () => void {
  if (!supabase) return () => {};
  const client = supabase;
  const channel = client
    .channel(`messages-realtime-${Math.random().toString(36).slice(2)}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "messages" },
      (payload) => onInsert(payload.new as RawMessage),
    )
    .subscribe();
  return () => {
    client.removeChannel(channel);
  };
}
