import { supabase } from "../lib/supabaseClient";
import type { AttendanceStatus } from "../types";

export interface RawAttendanceRecord {
  id: string;
  student_id: string;
  teacher_id: string | null;
  class_id: string | null;
  subject_label: string | null;
  date: string;
  status: AttendanceStatus;
  created_at: string;
}

export async function fetchAttendance(): Promise<RawAttendanceRecord[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("attendance_records")
    .select("*")
    .order("date", { ascending: false });
  if (error) throw new Error(error.message);
  return data as RawAttendanceRecord[];
}

export async function markAttendance(input: {
  studentId: string;
  teacherId: string;
  classId?: string;
  subjectLabel?: string;
  date: string;
  status: AttendanceStatus;
}): Promise<RawAttendanceRecord> {
  if (!supabase) throw new Error("Supabase is not configured");
  const { data, error } = await supabase
    .from("attendance_records")
    .upsert(
      [
        {
          student_id: input.studentId,
          teacher_id: input.teacherId,
          class_id: input.classId ?? null,
          subject_label: input.subjectLabel ?? null,
          date: input.date,
          status: input.status,
        },
      ],
      { onConflict: "student_id,teacher_id,class_id,date" },
    )
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as RawAttendanceRecord;
}

export function subscribeToAttendance(onChange: (row: RawAttendanceRecord) => void): () => void {
  if (!supabase) return () => {};
  const client = supabase;
  const channel = client
    .channel(`attendance-realtime-${Math.random().toString(36).slice(2)}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "attendance_records" },
      (payload) => onChange(payload.new as RawAttendanceRecord),
    )
    .subscribe();
  return () => {
    client.removeChannel(channel);
  };
}
