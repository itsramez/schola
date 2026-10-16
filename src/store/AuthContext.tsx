import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { isSupabaseConfigured } from "../lib/supabaseClient";
import { getSession, onAuthStateChange, signInWithPassword, signOut as signOutService } from "../services/authService";
import { getProfile, type SchoolUserRecord } from "../services/usersService";
import { getSchoolName } from "../services/schoolsService";
import { getOwnerProfile, type OwnerProfile } from "../services/ownersService";

interface AuthContextValue {
  /** Whether this build is even wired to a real Supabase project. */
  isConfigured: boolean;
  session: Session | null;
  profile: SchoolUserRecord | null;
  /** Set instead of `profile` when this login belongs to the platform owner, not a school account. */
  ownerProfile: OwnerProfile | null;
  /** The real school's name once profile loads — null in demo mode or before it resolves. */
  schoolName: string | null;
  /** true while checking for an existing session or loading the profile row. */
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<SchoolUserRecord | null>(null);
  const [ownerProfile, setOwnerProfile] = useState<OwnerProfile | null>(null);
  const [schoolName, setSchoolName] = useState<string | null>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    getSession().then((s) => {
      if (cancelled) return;
      setSession(s);
      if (!s) setLoading(false);
    });

    const unsubscribe = onAuthStateChange((s) => {
      if (cancelled) return;
      setSession(s);
      if (!s) {
        setProfile(null);
        setOwnerProfile(null);
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    setLoading(true);
    Promise.all([getProfile(session.user.id), getOwnerProfile(session.user.id)])
      .then(([p, owner]) => {
        if (cancelled) return;
        setProfile(p);
        setOwnerProfile(owner);
        if (p) getSchoolName(p.school_id).then((name) => !cancelled && setSchoolName(name));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [session]);

  const signIn = async (email: string, password: string) => {
    const { error } = await signInWithPassword(email, password);
    return { error };
  };

  const handleSignOut = async () => {
    await signOutService();
    setSession(null);
    setProfile(null);
    setOwnerProfile(null);
    setSchoolName(null);
  };

  const value: AuthContextValue = {
    isConfigured: isSupabaseConfigured,
    session,
    profile,
    ownerProfile,
    schoolName,
    loading,
    signIn,
    signOut: handleSignOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
