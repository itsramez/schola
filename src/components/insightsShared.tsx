import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";

export const DAY_MS = 24 * 60 * 60 * 1000;
export const WINDOW_DAYS = 7;
export const STEADY_THRESHOLD = 2;
export const LOW_THRESHOLD = 70;

export function average(nums: number[]): number | null {
  if (nums.length === 0) return null;
  return Math.round((nums.reduce((s, n) => s + n, 0) / nums.length) * 100);
}

function toMs(ts: string): number {
  return new Date(ts.length > 10 ? ts : `${ts}T00:00:00`).getTime();
}

/** Average % of rows falling inside [fromMs, toMs) — null if no rows land in that window. */
function windowAverage(rows: { ts: string; pct: number }[], fromMs: number, toMs_: number): number | null {
  const filtered = rows.filter((r) => {
    const t = toMs(r.ts);
    return t >= fromMs && t < toMs_;
  });
  return average(filtered.map((r) => r.pct));
}

/** Delta in percentage points between the last WINDOW_DAYS and the WINDOW_DAYS before that — null if either side lacks data. */
export function computeTrend(rows: { ts: string; pct: number }[]): number | null {
  const now = Date.now();
  const currentFrom = now - WINDOW_DAYS * DAY_MS;
  const previousFrom = now - 2 * WINDOW_DAYS * DAY_MS;
  const current = windowAverage(rows, currentFrom, now);
  const previous = windowAverage(rows, previousFrom, currentFrom);
  if (current === null || previous === null) return null;
  return Math.round(current - previous);
}

export function StatCard({ label, value, trend }: { label: string; value: string; trend?: number | null }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-2xl font-bold text-navy">{value}</p>
      <div className="flex items-center justify-between gap-2 mt-0.5">
        <p className="text-xs text-slate-500">{label}</p>
        <TrendBadge delta={trend ?? null} />
      </div>
    </div>
  );
}

export function TrendBadge({ delta }: { delta: number | null }) {
  if (delta === null) {
    return <span className="text-[11px] text-slate-300">no trend yet</span>;
  }
  if (Math.abs(delta) < STEADY_THRESHOLD) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-slate-400">
        <Minus className="h-3 w-3" />
        steady
      </span>
    );
  }
  const up = delta > 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-[11px] font-semibold ${up ? "text-mint" : "text-red-500"}`}
    >
      {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
      {up ? "+" : ""}
      {delta}pts
    </span>
  );
}

export function MetricPill({ label, value }: { label: string; value: number | null }) {
  const tone =
    value === null
      ? "bg-slate-100 text-slate-400"
      : value < LOW_THRESHOLD
        ? "bg-red-100 text-red-600"
        : "bg-mint/10 text-mint";
  return (
    <span className={`rounded-full px-2.5 py-1 ${tone}`}>
      {label} {value === null ? "—" : `${value}%`}
    </span>
  );
}
