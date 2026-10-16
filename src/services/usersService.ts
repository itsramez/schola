import { supabase } from "../lib/supabaseClient";
import type { UserRole } from "../types";

export interface SchoolUserRecord {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  subject_name: string | null;
  grade: number | null;
  section: string | null;
  section_id: string | null;
  guardian_name: string | null;
  linked_student_id: string | null;
  school_id: string;
  /** HH:MM — when this teacher is open to student DMs. Null on either means no restriction. */
  office_hours_start: string | null;
  office_hours_end: string | null;
  created_at: string;
}

export type NewSchoolUser = Omit<SchoolUserRecord, "id" | "created_at" | "linked_student_id"> & {
  id?: string;
  linked_student_id?: string | null;
};

const TABLE = "users";

export interface NewSchoolAccount {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  subject_name?: string | null;
  grade?: number | null;
  section?: string | null;
  section_id?: string | null;
  guardian_name?: string | null;
  linked_student_id?: string | null;
}

/**
 * Creates a real, login-capable account (auth user + profile row) via the
 * create-school-user Edge Function. This has to run server-side with the
 * service-role key — a client-side supabase.auth.signUp() call would sign
 * the calling admin out of their own session and into the new account.
 */
export async function createSchoolAccount(input: NewSchoolAccount): Promise<SchoolUserRecord> {
  if (!supabase) throw new Error("Supabase is not configured");
  const { data, error } = await supabase.functions.invoke("create-school-user", { body: input });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  return data.user as SchoolUserRecord;
}

/** @deprecated Only inserts a profile row — does not create a real login. Use createSchoolAccount instead. */
export async function createUser(input: NewSchoolUser): Promise<SchoolUserRecord> {
  if (!supabase) throw new Error("Supabase is not configured");
  const { data, error } = await supabase.from(TABLE).insert([input]).select().single();
  if (error) throw new Error(error.message);
  return data as SchoolUserRecord;
}

export async function listUsers(role?: UserRole): Promise<SchoolUserRecord[]> {
  if (!supabase) throw new Error("Supabase is not configured");
  let query = supabase.from(TABLE).select("*").order("created_at", { ascending: false });
  if (role) query = query.eq("role", role);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data as SchoolUserRecord[];
}

/** HH:MM strings, or null to remove the restriction entirely (always open to DMs). */
export async function updateOfficeHours(userId: string, start: string | null, end: string | null): Promise<void> {
  if (!supabase) throw new Error("Supabase is not configured");
  const { error } = await supabase
    .from(TABLE)
    .update({ office_hours_start: start, office_hours_end: end })
    .eq("id", userId);
  if (error) throw new Error(error.message);
}

/** Admin-only (enforced by the security-definer function) — (re)assigns a teacher's subject, or null to clear it. */
export async function setTeacherSubject(teacherId: string, subjectName: string | null): Promise<void> {
  if (!supabase) throw new Error("Supabase is not configured");
  const { error } = await supabase.rpc("admin_set_teacher_subject", {
    p_teacher_id: teacherId,
    p_subject_name: subjectName,
  });
  if (error) throw new Error(error.message);
}

/**
 * Live-updates the roster as accounts are added, removed, or edited — without this, a user
 * created or changed in one part of the app (e.g. Admin adding a teacher, or a teacher setting
 * their office hours) never appears in an already-open screen that cached the roster at mount
 * (e.g. Messages), until a full page reload.
 */
export function subscribeToUsers(
  onInsert: (user: SchoolUserRecord) => void,
  onDelete: (id: string) => void,
  onUpdate?: (user: SchoolUserRecord) => void,
): () => void {
  if (!supabase) return () => {};
  const client = supabase;
  // Unique per call — this is subscribed from more than one provider at once (Messaging and
  // AppData both mount together), and Supabase's realtime client errors if two subscriptions
  // share a channel name and the second tries to register listeners after the first subscribes.
  const channel = client
    .channel(`users-realtime-${Math.random().toString(36).slice(2)}`)
    .on("postgres_changes", { event: "INSERT", schema: "public", table: TABLE }, (payload) =>
      onInsert(payload.new as SchoolUserRecord),
    )
    .on("postgres_changes", { event: "DELETE", schema: "public", table: TABLE }, (payload) =>
      onDelete((payload.old as { id: string }).id),
    )
    .on("postgres_changes", { event: "UPDATE", schema: "public", table: TABLE }, (payload) =>
      onUpdate?.(payload.new as SchoolUserRecord),
    )
    .subscribe();
  return () => {
    client.removeChannel(channel);
  };
}

export async function getProfile(userId: string): Promise<SchoolUserRecord | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.from(TABLE).select("*").eq("id", userId).maybeSingle();
  if (error) throw new Error(error.message);
  return data as SchoolUserRecord | null;
}

/** @deprecated Direct table delete — blocked by RLS, and leaves the auth login orphaned. Use deleteSchoolAccount. */
export async function deleteUser(userId: string): Promise<void> {
  if (!supabase) throw new Error("Supabase is not configured");
  const { error } = await supabase.from(TABLE).delete().eq("id", userId);
  if (error) throw new Error(error.message);
}

/**
 * Removes both the login and the profile row via the delete-school-user
 * Edge Function. Requires the "admins can delete users" RLS policy and the
 * function to be deployed (see the SQL/CLI steps given alongside this).
 */
export async function deleteSchoolAccount(id: string): Promise<void> {
  if (!supabase) throw new Error("Supabase is not configured");
  const { data, error } = await supabase.functions.invoke("delete-school-user", { body: { id } });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
}

/** Case-insensitive check for whether an email is already registered — used to warn before submitting Add User. */
export async function checkEmailExists(email: string): Promise<boolean> {
  if (!supabase || !email.trim()) return false;
  const { data, error } = await supabase.from(TABLE).select("id").ilike("email", email.trim()).maybeSingle();
  if (error) return false;
  return Boolean(data);
}
