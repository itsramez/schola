import { GraduationCap, Heart, ShieldCheck, UserCog } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useAuth } from "../store/AuthContext";
import { useRole } from "../store/RoleContext";
import { ROLE_PERSONAS } from "../rolePersonas";
import type { UserRole } from "../types";

export interface CurrentPersona {
  name: string;
  subtitle: string;
  initials: string;
  icon: LucideIcon;
}

const ROLE_ICON: Record<UserRole, LucideIcon> = {
  student: GraduationCap,
  teacher: UserCog,
  admin: ShieldCheck,
  parent: Heart,
};

function initialsOf(name: string): string {
  return (
    name
      .split(" ")
      .map((p) => p[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?"
  );
}

function subtitleFor(role: UserRole, subjectName: string | null): string {
  switch (role) {
    case "teacher":
      return subjectName ? `${subjectName} Teacher` : "Teacher";
    case "admin":
      return "School Admin";
    case "parent":
      return "Parent";
    case "student":
      return "Student";
  }
}

/** Real logged-in profile when auth is wired up, falling back to the demo persona otherwise. */
export function useCurrentPersona(): CurrentPersona {
  const { isConfigured, profile } = useAuth();
  const { role } = useRole();

  if (isConfigured && profile) {
    return {
      name: profile.name,
      subtitle: subtitleFor(profile.role, profile.subject_name),
      initials: initialsOf(profile.name),
      icon: ROLE_ICON[profile.role],
    };
  }

  return ROLE_PERSONAS[role];
}
