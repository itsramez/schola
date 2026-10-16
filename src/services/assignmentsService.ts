import { supabase } from "../lib/supabaseClient";
import type { AssignmentStatus } from "../types";

export interface RawAttachment {
  id: string;
  type: string;
  name: string;
  detail?: string;
  dataUrl?: string;
  fileRemovedAt?: string;
}

export interface RawAssignment {
  id: string;
  teacher_id: string | null;
  class_id: string | null;
  subject_label: string;
  title: string;
  chapter: string | null;
  exercises: string | null;
  due_date: string;
  submission_enabled: boolean;
  attachments: RawAttachment[];
  assigned_student_ids: string[] | null;
  created_at: string;
}

export interface RawSubmission {
  id: string;
  assignment_id: string;
  student_id: string;
  status: AssignmentStatus;
  kind: "file" | "text" | null;
  file_name: string | null;
  file_type: "pdf" | "image" | null;
  data_url: string | null;
  text_content: string | null;
  submitted_at: string | null;
  file_removed_at: string | null;
  review_status: "graded" | "resubmit" | null;
  review_score: number | null;
  review_out_of: number | null;
  review_feedback: string | null;
  reviewed_at: string | null;
  updated_at: string;
}

export async function fetchAssignments(): Promise<RawAssignment[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("assignments")
    .select("*")
    .order("due_date", { ascending: true });
  if (error) throw new Error(error.message);
  return data as RawAssignment[];
}

export async function createAssignment(input: {
  teacherId: string;
  classId?: string;
  subjectLabel: string;
  title: string;
  chapter?: string;
  exercises?: string;
  dueDate: string;
  submissionEnabled: boolean;
  attachments: RawAttachment[];
  assignedStudentIds?: string[];
}): Promise<RawAssignment> {
  if (!supabase) throw new Error("Supabase is not configured");
  const { data, error } = await supabase
    .from("assignments")
    .insert([
      {
        teacher_id: input.teacherId,
        class_id: input.classId ?? null,
        subject_label: input.subjectLabel,
        title: input.title,
        chapter: input.chapter ?? null,
        exercises: input.exercises ?? null,
        due_date: input.dueDate,
        submission_enabled: input.submissionEnabled,
        attachments: input.attachments,
        assigned_student_ids: input.assignedStudentIds && input.assignedStudentIds.length > 0 ? input.assignedStudentIds : null,
      },
    ])
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as RawAssignment;
}

/** Best-effort purge of a stale/graded assignment's attached worksheet bytes — metadata stays. */
export async function purgeAssignmentAttachments(assignmentId: string, attachments: RawAttachment[]): Promise<void> {
  if (!supabase) return;
  await supabase.from("assignments").update({ attachments }).eq("id", assignmentId);
}

export async function fetchSubmissions(): Promise<RawSubmission[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from("submissions").select("*");
  if (error) throw new Error(error.message);
  return data as RawSubmission[];
}

/**
 * Partial-column upsert: omitted keys preserve their existing value on conflict (and fall back
 * to the column default on first insert) — callers only need to pass the fields they're changing.
 */
export async function upsertSubmissionRow(
  payload: { assignment_id: string; student_id: string } & Partial<RawSubmission>,
): Promise<RawSubmission> {
  if (!supabase) throw new Error("Supabase is not configured");
  const { data, error } = await supabase
    .from("submissions")
    .upsert([payload], { onConflict: "assignment_id,student_id" })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as RawSubmission;
}

export function subscribeToAssignments(onInsert: (row: RawAssignment) => void): () => void {
  if (!supabase) return () => {};
  const client = supabase;
  const channel = client
    .channel(`assignments-realtime-${Math.random().toString(36).slice(2)}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "assignments" },
      (payload) => onInsert(payload.new as RawAssignment),
    )
    .subscribe();
  return () => {
    client.removeChannel(channel);
  };
}

export function subscribeToSubmissions(onChange: (row: RawSubmission) => void): () => void {
  if (!supabase) return () => {};
  const client = supabase;
  const channel = client
    .channel(`submissions-realtime-${Math.random().toString(36).slice(2)}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "submissions" },
      (payload) => onChange(payload.new as RawSubmission),
    )
    .subscribe();
  return () => {
    client.removeChannel(channel);
  };
}
