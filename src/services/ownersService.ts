import { supabase } from "../lib/supabaseClient";

export interface OwnerProfile {
  id: string;
  name: string;
  email: string;
}

export async function getOwnerProfile(userId: string): Promise<OwnerProfile | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.from("owners").select("*").eq("id", userId).maybeSingle();
  if (error || !data) return null;
  return { id: data.id, name: data.name, email: data.email };
}

export interface SchoolSummary {
  id: string;
  name: string;
  createdAt: string;
  studentCount: number;
  teacherCount: number;
  adminCount: number;
}

export interface SchoolAdmin {
  id: string;
  name: string;
  email: string;
}

/** Owner-only: every school on the platform, with a roster count breakdown. */
export async function fetchAllSchoolsWithCounts(): Promise<SchoolSummary[]> {
  if (!supabase) return [];
  const [{ data: schools, error: schoolsError }, { data: users, error: usersError }] = await Promise.all([
    supabase.from("schools").select("id, name, created_at"),
    supabase.from("users").select("school_id, role"),
  ]);
  if (schoolsError) throw new Error(schoolsError.message);
  if (usersError) throw new Error(usersError.message);

  return (schools ?? []).map((s) => {
    const rows = (users ?? []).filter((u) => u.school_id === s.id);
    return {
      id: s.id,
      name: s.name,
      createdAt: s.created_at,
      studentCount: rows.filter((u) => u.role === "student").length,
      teacherCount: rows.filter((u) => u.role === "teacher").length,
      adminCount: rows.filter((u) => u.role === "admin").length,
    };
  });
}

export async function fetchSchoolAdmins(schoolId: string): Promise<SchoolAdmin[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("users")
    .select("id, name, email")
    .eq("school_id", schoolId)
    .eq("role", "admin");
  if (error) throw new Error(error.message);
  return (data ?? []) as SchoolAdmin[];
}
