import { supabase } from "../lib/supabaseClient";
import type { AnnouncementAudienceType, AnnouncementCategory } from "../types";

export interface RawAnnouncement {
  id: string;
  title: string;
  body: string;
  category: AnnouncementCategory;
  important: boolean;
  audience_type: AnnouncementAudienceType;
  audience_label: string;
  audience_grade: number | null;
  audience_subject: string | null;
  audience_student_ids: string[] | null;
  author_id: string | null;
  created_at: string;
}

export async function fetchAnnouncements(): Promise<RawAnnouncement[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("announcements")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data as RawAnnouncement[];
}

export async function createAnnouncement(input: {
  title: string;
  body: string;
  category: AnnouncementCategory;
  important: boolean;
  audienceType: AnnouncementAudienceType;
  audienceLabel: string;
  audienceGrade?: number | null;
  audienceSubject?: string | null;
  audienceStudentIds?: string[] | null;
  authorId: string;
}): Promise<RawAnnouncement> {
  if (!supabase) throw new Error("Supabase is not configured");
  const { data, error } = await supabase
    .from("announcements")
    .insert([
      {
        title: input.title,
        body: input.body,
        category: input.category,
        important: input.important,
        audience_type: input.audienceType,
        audience_label: input.audienceLabel,
        audience_grade: input.audienceGrade ?? null,
        audience_subject: input.audienceSubject ?? null,
        audience_student_ids: input.audienceStudentIds ?? null,
        author_id: input.authorId,
      },
    ])
    .select()
    .single();
  if (error) throw new Error(error.message);
  return data as RawAnnouncement;
}

export function subscribeToAnnouncements(onInsert: (row: RawAnnouncement) => void): () => void {
  if (!supabase) return () => {};
  const client = supabase;
  const channel = client
    .channel(`announcements-realtime-${Math.random().toString(36).slice(2)}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "announcements" },
      (payload) => onInsert(payload.new as RawAnnouncement),
    )
    .subscribe();
  return () => {
    client.removeChannel(channel);
  };
}
