import { supabase } from "../lib/supabaseClient";

export interface RawQuizQuestion {
  id: string;
  text: string;
  options: string[];
  correctIndex: number;
}

export interface RawQuiz {
  id: string;
  teacher_id: string;
  class_id: string | null;
  title: string;
  section: string | null;
  due_date: string | null;
  questions: RawQuizQuestion[];
  assigned_student_ids: string[] | null;
  weight_percent: number | null;
  created_at: string;
}

export interface RawQuizAttempt {
  id: string;
  quiz_id: string;
  student_id: string;
  answers: number[];
  score: number;
  out_of: number;
  submitted_at: string;
}

export interface RawQuizWeightOverride {
  id: string;
  quiz_id: string;
  student_id: string;
  weight_percent: number;
  school_id: string | null;
  created_at: string;
}

export async function createQuiz(input: {
  teacherId: string;
  classId?: string;
  title: string;
  section?: string;
  dueDate?: string;
  questions: RawQuizQuestion[];
  assignedStudentIds?: string[];
  weightPercent?: number;
}): Promise<RawQuiz> {
  if (!supabase) throw new Error("Supabase is not configured");
  const { data, error } = await supabase
    .from("quizzes")
    .insert([
      {
        teacher_id: input.teacherId,
        class_id: input.classId ?? null,
        title: input.title,
        section: input.section ?? null,
        due_date: input.dueDate ?? null,
        questions: input.questions,
        assigned_student_ids: input.assignedStudentIds && input.assignedStudentIds.length > 0 ? input.assignedStudentIds : null,
        weight_percent: input.weightPercent ?? null,
      },
    ])
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as RawQuiz;
}

export async function fetchQuizzes(): Promise<RawQuiz[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from("quizzes").select("*").order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data as RawQuiz[];
}

export async function fetchQuizAttempts(): Promise<RawQuizAttempt[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from("quiz_attempts").select("*");
  if (error) throw new Error(error.message);
  return data as RawQuizAttempt[];
}

export async function submitQuizAttempt(input: {
  quizId: string;
  studentId: string;
  answers: number[];
  score: number;
  outOf: number;
}): Promise<RawQuizAttempt> {
  if (!supabase) throw new Error("Supabase is not configured");
  const { data, error } = await supabase
    .from("quiz_attempts")
    .insert([
      {
        quiz_id: input.quizId,
        student_id: input.studentId,
        answers: input.answers,
        score: input.score,
        out_of: input.outOf,
      },
    ])
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as RawQuizAttempt;
}

/** Teacher/admin-only (enforced by RLS) — edits a quiz's weight after it's already been created. */
export async function updateQuizWeight(quizId: string, weightPercent: number | null): Promise<RawQuiz> {
  if (!supabase) throw new Error("Supabase is not configured");
  const { data, error } = await supabase
    .from("quizzes")
    .update({ weight_percent: weightPercent })
    .eq("id", quizId)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as RawQuiz;
}

export async function fetchQuizWeightOverrides(): Promise<RawQuizWeightOverride[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from("quiz_weight_overrides").select("*");
  if (error) throw new Error(error.message);
  return data as RawQuizWeightOverride[];
}

/** Teacher/admin-only (enforced by RLS) — sets a per-student weight for one quiz. */
export async function upsertQuizWeightOverride(input: {
  quizId: string;
  studentId: string;
  weightPercent: number;
}): Promise<RawQuizWeightOverride> {
  if (!supabase) throw new Error("Supabase is not configured");
  const { data, error } = await supabase
    .from("quiz_weight_overrides")
    .upsert(
      [{ quiz_id: input.quizId, student_id: input.studentId, weight_percent: input.weightPercent }],
      { onConflict: "quiz_id,student_id" },
    )
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as RawQuizWeightOverride;
}

export async function deleteQuizWeightOverride(quizId: string, studentId: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase
    .from("quiz_weight_overrides")
    .delete()
    .eq("quiz_id", quizId)
    .eq("student_id", studentId);
  if (error) throw new Error(error.message);
}

export function subscribeToQuizWeightOverrides(onChange: () => void): () => void {
  if (!supabase) return () => {};
  const client = supabase;
  const channel = client
    .channel(`quiz-weight-overrides-realtime-${Math.random().toString(36).slice(2)}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "quiz_weight_overrides" }, onChange)
    .subscribe();
  return () => {
    client.removeChannel(channel);
  };
}

export function subscribeToQuizzes(onInsert: (row: RawQuiz) => void): () => void {
  if (!supabase) return () => {};
  const client = supabase;
  const channel = client
    .channel(`quizzes-realtime-${Math.random().toString(36).slice(2)}`)
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "quizzes" }, (payload) =>
      onInsert(payload.new as RawQuiz),
    )
    .subscribe();
  return () => {
    client.removeChannel(channel);
  };
}

export function subscribeToQuizAttempts(onInsert: (row: RawQuizAttempt) => void): () => void {
  if (!supabase) return () => {};
  const client = supabase;
  const channel = client
    .channel(`quiz-attempts-realtime-${Math.random().toString(36).slice(2)}`)
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "quiz_attempts" }, (payload) =>
      onInsert(payload.new as RawQuizAttempt),
    )
    .subscribe();
  return () => {
    client.removeChannel(channel);
  };
}
