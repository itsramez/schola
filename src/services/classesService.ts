import { supabase } from "../lib/supabaseClient";

export type RosterMode = "section" | "manual";

export interface RawClass {
  id: string;
  school_id: string;
  teacher_id: string;
  subject_id: string;
  roster_mode: RosterMode;
  section_id: string | null;
  name: string | null;
  created_at: string;
}

export interface RawClassEnrollment {
  id: string;
  school_id: string | null;
  class_id: string;
  student_id: string;
  created_at: string;
}

export async function fetchClasses(): Promise<RawClass[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from("classes").select("*").order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return data as RawClass[];
}

export async function fetchClassEnrollments(): Promise<RawClassEnrollment[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from("class_enrollments").select("*");
  if (error) throw new Error(error.message);
  return data as RawClassEnrollment[];
}

/** Admin-only (enforced by RLS) — creates a class (teacher × subject × roster). */
export async function createClass(input: {
  teacherId: string;
  subjectId: string;
  rosterMode: RosterMode;
  sectionId?: string | null;
  name?: string | null;
}): Promise<RawClass> {
  if (!supabase) throw new Error("Supabase is not configured");
  const { data, error } = await supabase
    .from("classes")
    .insert([
      {
        teacher_id: input.teacherId,
        subject_id: input.subjectId,
        roster_mode: input.rosterMode,
        section_id: input.rosterMode === "section" ? input.sectionId ?? null : null,
        name: input.name?.trim() || null,
      },
    ])
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as RawClass;
}

export async function deleteClass(id: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from("classes").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

/** Admin-only (enforced by RLS) — adds a student to a manual-roster class. */
export async function enrollStudent(classId: string, studentId: string): Promise<RawClassEnrollment> {
  if (!supabase) throw new Error("Supabase is not configured");
  const { data, error } = await supabase
    .from("class_enrollments")
    .insert([{ class_id: classId, student_id: studentId }])
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as RawClassEnrollment;
}

export async function unenrollStudent(classId: string, studentId: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase
    .from("class_enrollments")
    .delete()
    .eq("class_id", classId)
    .eq("student_id", studentId);
  if (error) throw new Error(error.message);
}

export function subscribeToClasses(onChange: () => void): () => void {
  if (!supabase) return () => {};
  const client = supabase;
  const channel = client
    .channel(`classes-realtime-${Math.random().toString(36).slice(2)}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "classes" }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "class_enrollments" }, onChange)
    .subscribe();
  return () => {
    client.removeChannel(channel);
  };
}
