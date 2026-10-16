import { Link } from "react-router-dom";
import type { LucideIcon } from "lucide-react";

export default function LauncherTile({
  icon: Icon,
  label,
  badge,
  badgeTone = "neutral",
  onClick,
  to,
}: {
  icon: LucideIcon;
  label: string;
  badge: string;
  badgeTone?: "neutral" | "ok" | "alert";
  onClick?: () => void;
  to?: string;
}) {
  const badgeClassName =
    badgeTone === "alert" ? "text-amber-600 font-medium" : badgeTone === "ok" ? "text-mint font-medium" : "text-slate-400";
  const content = (
    <>
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue/10 text-blue">
        <Icon className="h-5.5 w-5.5" />
      </div>
      <p className="font-semibold text-slate-800 mt-3">{label}</p>
      <p className={`text-xs mt-0.5 ${badgeClassName}`}>{badge}</p>
    </>
  );
  const className =
    "flex flex-col items-start rounded-2xl border border-slate-200 bg-white p-5 text-left hover:border-blue/40 hover:bg-blue/5 transition-colors";
  if (to) {
    return (
      <Link to={to} className={className}>
        {content}
      </Link>
    );
  }
  return (
    <button onClick={onClick} className={className}>
      {content}
    </button>
  );
}
