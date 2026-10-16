import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, CircleDashed, Loader2 } from "lucide-react";
import type { AssignmentStatus } from "../types";
import { STATUS_ORDER } from "../store/AppDataContext";

export const statusConfig: Record<
  AssignmentStatus,
  { label: string; icon: typeof Check; className: string }
> = {
  not_started: {
    label: "Not Started",
    icon: CircleDashed,
    className: "bg-red-50 text-red-600 border-red-200",
  },
  in_progress: {
    label: "In Progress",
    icon: Loader2,
    className: "bg-blue-50 text-blue border-blue-200",
  },
  completed: {
    label: "Completed",
    icon: Check,
    className: "bg-mint/10 text-mint border-mint/30",
  },
};

interface StatusControlProps {
  status: AssignmentStatus;
  onChange: (status: AssignmentStatus) => void;
}

export default function StatusControl({ status, onChange }: StatusControlProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const config = statusConfig[status];
  const Icon = config.icon;

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        title="Change status"
        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-colors cursor-pointer hover:brightness-95 ${config.className}`}
      >
        <Icon className="h-3.5 w-3.5" />
        {config.label}
        <ChevronDown className="h-3 w-3 opacity-60" />
      </button>

      {open && (
        <div className="absolute right-0 z-10 mt-1.5 w-44 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg">
          {STATUS_ORDER.map((key) => {
            const opt = statusConfig[key];
            const OptIcon = opt.icon;
            const isCurrent = key === status;
            return (
              <button
                key={key}
                type="button"
                onClick={() => {
                  onChange(key);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium transition-colors ${
                  isCurrent ? "bg-slate-100 text-slate-800" : "text-slate-500 hover:bg-slate-50"
                }`}
              >
                <OptIcon className="h-3.5 w-3.5 shrink-0" />
                {opt.label}
                {isCurrent && <Check className="h-3.5 w-3.5 ml-auto text-mint" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
