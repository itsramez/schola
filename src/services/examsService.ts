import { supabase } from "../lib/supabaseClient";
import type { ExamKind } from "../types";

export interface RawExam {
  id: string;
  teacher_id: string;
  class_id: string | null;
  title: string;
  subject_label: string;
  kind: ExamKind;
  date: string;
  detail: string | null;
  assigned_student_ids: string[] | null;
  weight_percent: number | null;
  school_id: string;
  created_at: string;
}

export interface RawExamGrade {
  id: string;
  exam_id: string;
  student_id: string;
  score: number;
  out_of: number;
  school_id: string | null;
  graded_at: string;
}

export interface RawExamWeightOverride {
  id: string;
  exam_id: string;
  student_id: string;
  weight_percent: number;
  school_id: string | null;
  created_at: string;
}

export async function fetchExams(): Promise<RawExam[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from("exams").select("*").order("date", { ascending: true });
  if (error) throw new Error(error.message);
  return data as RawExam[];
}

export async function createExam(input: {
  teacherId: string;
  classId?: string;
  title: string;
  subjectLabel: string;
  kind: ExamKind;
  date: string;
  detail?: string;
  assignedStudentIds?: string[];
  weightPercent?: number;
}): Promise<RawExam> {
  if (!supabase) throw new Error("Supabase is not configured");
  const { data, error } = await supabase
    .from("exams")
    .insert([
      {
        teacher_id: input.teacherId,
        class_id: input.classId ?? null,
        title: input.title,
        subject_label: input.subjectLabel,
        kind: input.kind,
        date: input.date,
        detail: input.detail ?? null,
        assigned_student_ids: input.assignedStudentIds && input.assignedStudentIds.length > 0 ? input.assignedStudentIds : null,
        weight_percent: input.weightPercent ?? null,
      },
    ])
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as RawExam;
}

export function subscribeToExams(onInsert: (row: RawExam) => void): () => void {
  if (!supabase) return () => {};
  const client = supabase;
  const channel = client
    .channel(`exams-realtime-${Math.random().toString(36).slice(2)}`)
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "exams" }, (payload) =>
      onInsert(payload.new as RawExam),
    )
    .subscribe();
  return () => {
    client.removeChannel(channel);
  };
}

export async function fetchExamGrades(): Promise<RawExamGrade[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from("exam_grades").select("*");
  if (error) throw new Error(error.message);
  return data as RawExamGrade[];
}

/** Teacher/admin-only (enforced by RLS) — creates or overwrites a student's grade for an exam. */
export async function upsertExamGrade(input: {
  examId: string;
  studentId: string;
  score: number;
  outOf: number;
}): Promise<RawExamGrade> {
  if (!supabase) throw new Error("Supabase is not configured");
  const { data, error } = await supabase
    .from("exam_grades")
    .upsert(
      [{ exam_id: input.examId, student_id: input.studentId, score: input.score, out_of: input.outOf }],
      { onConflict: "exam_id,student_id" },
    )
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as RawExamGrade;
}

export function subscribeToExamGrades(onChange: () => void): () => void {
  if (!supabase) return () => {};
  const client = supabase;
  const channel = client
    .channel(`exam-grades-realtime-${Math.random().toString(36).slice(2)}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "exam_grades" }, onChange)
    .subscribe();
  return () => {
    client.removeChannel(channel);
  };
}

/** Teacher/admin-only (enforced by RLS) — edits an exam's weight after it's already been created. */
export async function updateExamWeight(examId: string, weightPercent: number | null): Promise<RawExam> {
  if (!supabase) throw new Error("Supabase is not configured");
  const { data, error } = await supabase
    .from("exams")
    .update({ weight_percent: weightPercent })
    .eq("id", examId)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as RawExam;
}

export async function fetchExamWeightOverrides(): Promise<RawExamWeightOverride[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from("exam_weight_overrides").select("*");
  if (error) throw new Error(error.message);
  return data as RawExamWeightOverride[];
}

/** Teacher/admin-only (enforced by RLS) — sets a per-student weight for one exam. */
export async function upsertExamWeightOverride(input: {
  examId: string;
  studentId: string;
  weightPercent: number;
}): Promise<RawExamWeightOverride> {
  if (!supabase) throw new Error("Supabase is not configured");
  const { data, error } = await supabase
    .from("exam_weight_overrides")
    .upsert(
      [{ exam_id: input.examId, student_id: input.studentId, weight_percent: input.weightPercent }],
      { onConflict: "exam_id,student_id" },
    )
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as RawExamWeightOverride;
}

export async function deleteExamWeightOverride(examId: string, studentId: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase
    .from("exam_weight_overrides")
    .delete()
    .eq("exam_id", examId)
    .eq("student_id", studentId);
  if (error) throw new Error(error.message);
}

export function subscribeToExamWeightOverrides(onChange: () => void): () => void {
  if (!supabase) return () => {};
  const client = supabase;
  const channel = client
    .channel(`exam-weight-overrides-realtime-${Math.random().toString(36).slice(2)}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "exam_weight_overrides" }, onChange)
    .subscribe();
  return () => {
    client.removeChannel(channel);
  };
}
