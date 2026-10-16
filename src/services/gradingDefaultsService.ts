import { supabase } from "../lib/supabaseClient";

export interface RawGradingDefaults {
  teacher_id: string;
  quiz_weight: number | null;
  exam_weight: number | null;
}

export async function fetchGradingDefaults(teacherId: string): Promise<RawGradingDefaults | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("teacher_grading_defaults")
    .select("*")
    .eq("teacher_id", teacherId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as RawGradingDefaults | null) ?? null;
}

export async function upsertGradingDefaults(input: {
  teacherId: string;
  quizWeight?: number | null;
  examWeight?: number | null;
}): Promise<RawGradingDefaults> {
  if (!supabase) throw new Error("Supabase is not configured");
  const { data, error } = await supabase
    .from("teacher_grading_defaults")
    .upsert(
      [{ teacher_id: input.teacherId, quiz_weight: input.quizWeight ?? null, exam_weight: input.examWeight ?? null }],
      { onConflict: "teacher_id" },
    )
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as RawGradingDefaults;
}

export function subscribeToGradingDefaults(onChange: () => void): () => void {
  if (!supabase) return () => {};
  const client = supabase;
  const channel = client
    .channel(`teacher-grading-defaults-realtime-${Math.random().toString(36).slice(2)}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "teacher_grading_defaults" }, onChange)
    .subscribe();
  return () => {
    client.removeChannel(channel);
  };
}
