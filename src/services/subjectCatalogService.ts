import { supabase } from "../lib/supabaseClient";

export interface RawSubjectCatalogEntry {
  id: string;
  school_id: string;
  name: string;
  created_at: string;
}

export async function fetchSubjectCatalog(): Promise<RawSubjectCatalogEntry[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from("subject_catalog").select("*").order("name", { ascending: true });
  if (error) throw new Error(error.message);
  return data as RawSubjectCatalogEntry[];
}

/** Admin-only (enforced by RLS) — adds a subject name to the catalog. */
export async function addSubjectCatalogEntry(name: string): Promise<RawSubjectCatalogEntry> {
  if (!supabase) throw new Error("Supabase is not configured");
  const { data, error } = await supabase.from("subject_catalog").insert([{ name }]).select().single();
  if (error) throw new Error(error.message);
  return data as RawSubjectCatalogEntry;
}

export async function removeSubjectCatalogEntry(id: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from("subject_catalog").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export function subscribeToSubjectCatalog(onChange: () => void): () => void {
  if (!supabase) return () => {};
  const client = supabase;
  const channel = client
    .channel(`subject-catalog-realtime-${Math.random().toString(36).slice(2)}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "subject_catalog" }, onChange)
    .subscribe();
  return () => {
    client.removeChannel(channel);
  };
}
