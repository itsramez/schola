import { supabase } from "../lib/supabaseClient";

export async function getSchoolName(schoolId: string): Promise<string | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.from("schools").select("name").eq("id", schoolId).maybeSingle();
  if (error || !data) return null;
  return data.name as string;
}
