import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useAuth } from "./AuthContext";
import type { UserRole } from "../types";

const ROLE_KEY = "schola.role.v1";
const VALID_ROLES: UserRole[] = ["student", "teacher", "admin", "parent"];

function loadRole(): UserRole {
  try {
    const raw = localStorage.getItem(ROLE_KEY);
    return VALID_ROLES.includes(raw as UserRole) ? (raw as UserRole) : "student";
  } catch {
    return "student";
  }
}

interface RoleContextValue {
  role: UserRole;
  /** No-op once real auth is active — role then comes from who's logged in, not a manual switch. */
  setRole: (role: UserRole) => void;
  /** True when role is demo-switchable (no real Supabase auth wired up yet). */
  isDemoMode: boolean;
}

const RoleContext = createContext<RoleContextValue | null>(null);

export function RoleProvider({ children }: { children: ReactNode }) {
  const { isConfigured, profile } = useAuth();
  const [demoRole, setDemoRole] = useState<UserRole>(() => loadRole());

  useEffect(() => {
    if (isConfigured) return;
    try {
      localStorage.setItem(ROLE_KEY, demoRole);
    } catch {
      // ignore storage errors
    }
  }, [demoRole, isConfigured]);

  const isDemoMode = !isConfigured;
  const role = isConfigured ? (profile?.role ?? "student") : demoRole;
  const setRole = isDemoMode ? setDemoRole : () => {};

  return <RoleContext.Provider value={{ role, setRole, isDemoMode }}>{children}</RoleContext.Provider>;
}

export function useRole(): RoleContextValue {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error("useRole must be used within RoleProvider");
  return ctx;
}
