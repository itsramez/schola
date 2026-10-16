import { BookOpen, Code2, FlaskConical, Landmark, Palette, Sigma } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export const subjectIconMap: Record<string, LucideIcon> = {
  Sigma,
  FlaskConical,
  BookOpen,
  Landmark,
  Code2,
  Palette,
};

export function getSubjectIcon(name: string): LucideIcon {
  return subjectIconMap[name] ?? BookOpen;
}
