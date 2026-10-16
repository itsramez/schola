import { supabase } from "../lib/supabaseClient";

export interface RawClassSection {
  id: string;
  school_id: string;
  name: string;
  grade: number | null;
  created_at: string;
}

export interface RawSectionPeriod {
  id: string;
  section_id: string;
  school_id: string;
  day: number;
  start_time: string;
  end_time: string;
  subject_label: string;
  teacher_id: string | null;
  class_id: string | null;
  room: string | null;
  created_at: string;
}

export async function fetchSections(): Promise<RawClassSection[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from("class_sections").select("*").order("name", { ascending: true });
  if (error) throw new Error(error.message);
  return data as RawClassSection[];
}

export async function createSection(input: { name: string; grade?: number }): Promise<RawClassSection> {
  if (!supabase) throw new Error("Supabase is not configured");
  const { data, error } = await supabase
    .from("class_sections")
    .insert([{ name: input.name, grade: input.grade ?? null }])
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as RawClassSection;
}

export async function deleteSection(id: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from("class_sections").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function fetchSectionPeriods(): Promise<RawSectionPeriod[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("class_section_periods")
    .select("*")
    .order("start_time", { ascending: true });
  if (error) throw new Error(error.message);
  return data as RawSectionPeriod[];
}

export async function createSectionPeriod(input: {
  sectionId: string;
  day: number;
  startTime: string;
  endTime: string;
  classId: string;
  /** Denormalized for display/legacy consumers — kept in sync with the chosen class's own subject/teacher. */
  subjectLabel: string;
  teacherId?: string;
  room?: string;
}): Promise<RawSectionPeriod> {
  if (!supabase) throw new Error("Supabase is not configured");
  const { data, error } = await supabase
    .from("class_section_periods")
    .insert([
      {
        section_id: input.sectionId,
        day: input.day,
        start_time: input.startTime,
        end_time: input.endTime,
        class_id: input.classId,
        subject_label: input.subjectLabel,
        teacher_id: input.teacherId ?? null,
        room: input.room ?? null,
      },
    ])
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as RawSectionPeriod;
}

export async function deleteSectionPeriod(id: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from("class_section_periods").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

/** Admin-only (enforced by the security-definer function) — reassigns a student to a different section, or null to remove it. */
export async function setStudentSection(studentId: string, sectionId: string | null): Promise<void> {
  if (!supabase) throw new Error("Supabase is not configured");
  const { error } = await supabase.rpc("admin_set_student_section", {
    p_student_id: studentId,
    p_section_id: sectionId,
  });
  if (error) throw new Error(error.message);
}

export function subscribeToSections(onChange: () => void): () => void {
  if (!supabase) return () => {};
  const client = supabase;
  const channel = client
    .channel(`class-sections-realtime-${Math.random().toString(36).slice(2)}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "class_sections" }, onChange)
    .on("postgres_changes", { event: "*", schema: "public", table: "class_section_periods" }, onChange)
    .subscribe();
  return () => {
    client.removeChannel(channel);
  };
}
