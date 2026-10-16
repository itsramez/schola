import { supabase } from "../lib/supabaseClient";

/** Keys for school-level feature flags the owner can toggle on/off per school. */
export type FeatureKey =
  | "sections"
  | "gradebook"
  | "gradebook_student_overrides"
  | "fees"
  | "fees_itemized"
  | "fees_grade_based"
  | "fees_subject_based";

export async function fetchSchoolFeatures(schoolId: string): Promise<Record<string, boolean>> {
  if (!supabase) return {};
  const { data, error } = await supabase.from("school_features").select("feature_key, enabled").eq("school_id", schoolId);
  if (error) throw new Error(error.message);
  const map: Record<string, boolean> = {};
  for (const row of data ?? []) map[row.feature_key] = row.enabled;
  return map;
}

/** Owner-only — enforced by RLS. */
export async function setSchoolFeature(schoolId: string, featureKey: FeatureKey, enabled: boolean): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase
    .from("school_features")
    .upsert([{ school_id: schoolId, feature_key: featureKey, enabled, updated_at: new Date().toISOString() }], {
      onConflict: "school_id,feature_key",
    });
  if (error) throw new Error(error.message);
}

export function subscribeToSchoolFeatures(schoolId: string, onChange: () => void): () => void {
  if (!supabase) return () => {};
  const client = supabase;
  const channel = client
    .channel(`school-features-realtime-${Math.random().toString(36).slice(2)}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "school_features", filter: `school_id=eq.${schoolId}` },
      onChange,
    )
    .subscribe();
  return () => {
    client.removeChannel(channel);
  };
}
