import type { LucideIcon } from "lucide-react";

export default function ComposerNotice({
  icon: Icon,
  text,
}: {
  icon: LucideIcon;
  text: string;
}) {
  return (
    <div className="flex items-center gap-2 border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
      <Icon className="h-4 w-4 shrink-0 text-slate-400" />
      {text}
    </div>
  );
}
