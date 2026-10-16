import { GraduationCap, Heart, ShieldCheck, UserCog } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { UserRole } from "./types";

export interface RolePersona {
  name: string;
  subtitle: string;
  initials: string;
  icon: LucideIcon;
}

export const ROLE_PERSONAS: Record<UserRole, RolePersona> = {
  student: { name: "Amara Silva", subtitle: "Grade 9 · Student", initials: "AS", icon: GraduationCap },
  teacher: { name: "Ms. Sara Ortega", subtitle: "Science Teacher", initials: "SO", icon: UserCog },
  admin: { name: "Mr. James Whitfield", subtitle: "School Admin", initials: "JW", icon: ShieldCheck },
  parent: { name: "Robert Silva", subtitle: "Parent of Amara", initials: "RS", icon: Heart },
};
