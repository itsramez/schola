import type { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabaseClient";

export async function signInWithPassword(
  email: string,
  password: string,
): Promise<{ session: Session | null; error: string | null }> {
  if (!supabase) return { session: null, error: "Supabase is not configured" };
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  return { session: data.session, error: error?.message ?? null };
}

export async function signOut(): Promise<void> {
  if (!supabase) return;
  await supabase.auth.signOut();
}

export async function getSession(): Promise<Session | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export function onAuthStateChange(callback: (session: Session | null) => void): () => void {
  if (!supabase) return () => {};
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, session) => callback(session));
  return () => subscription.unsubscribe();
}
