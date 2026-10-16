const DAY_LABELS: Record<number, string> = {
  1: "Monday",
  2: "Tuesday",
  3: "Wednesday",
  4: "Thursday",
  5: "Friday",
  6: "Saturday",
  0: "Sunday",
};
const DAY_ORDER = [1, 2, 3, 4, 5, 6];
const HOUR_HEIGHT = 64;

const PALETTE = ["#2563EB", "#DC2626", "#059669", "#D97706", "#7C3AED", "#DB2777", "#0891B2", "#65A30D"];

/** Deterministic color for a label with no explicit color (e.g. a free-text subject with no linked teacher). */
export function colorForLabel(label: string): string {
  let hash = 0;
  for (let i = 0; i < label.length; i++) hash = (hash * 31 + label.charCodeAt(i)) >>> 0;
  return PALETTE[hash % PALETTE.length];
}

function toMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
}

export interface SchedulePeriodBlock {
  id: string;
  day: number;
  startTime: string;
  endTime: string;
  title: string;
  subtitle?: string;
  color: string;
  onClick?: () => void;
}

export default function WeeklyScheduleGrid({ periods }: { periods: SchedulePeriodBlock[] }) {
  if (periods.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-400 text-sm">
        No periods scheduled yet.
      </div>
    );
  }

  const starts = periods.map((p) => toMinutes(p.startTime));
  const ends = periods.map((p) => toMinutes(p.endTime));
  const gridStartHour = Math.max(0, Math.floor(Math.min(...starts) / 60));
  const gridEndHour = Math.min(24, Math.ceil(Math.max(...ends) / 60));
  const hours: number[] = [];
  for (let h = gridStartHour; h < gridEndHour; h++) hours.push(h);
  const gridStartMin = gridStartHour * 60;
  const totalHeight = Math.max(1, gridEndHour - gridStartHour) * HOUR_HEIGHT;

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <div className="min-w-[640px]">
        <div className="grid" style={{ gridTemplateColumns: `56px repeat(${DAY_ORDER.length}, 1fr)` }}>
          <div />
          {DAY_ORDER.map((d) => (
            <div
              key={d}
              className="px-2 py-2 text-center text-xs font-semibold text-slate-500 border-b border-l border-slate-100"
            >
              {DAY_LABELS[d]}
            </div>
          ))}
        </div>
        <div className="grid" style={{ gridTemplateColumns: `56px repeat(${DAY_ORDER.length}, 1fr)` }}>
          <div className="relative" style={{ height: totalHeight }}>
            {hours.map((h) => (
              <div
                key={h}
                className="absolute left-0 right-0 text-right pr-2 text-[11px] text-slate-400"
                style={{ top: (h - gridStartHour) * HOUR_HEIGHT - 6 }}
              >
                {String(h).padStart(2, "0")}:00
              </div>
            ))}
          </div>
          {DAY_ORDER.map((d) => (
            <div key={d} className="relative border-l border-slate-100" style={{ height: totalHeight }}>
              {hours.map((h) => (
                <div
                  key={h}
                  className="absolute left-0 right-0 border-t border-slate-100"
                  style={{ top: (h - gridStartHour) * HOUR_HEIGHT }}
                />
              ))}
              {periods
                .filter((p) => p.day === d)
                .map((p) => {
                  const top = ((toMinutes(p.startTime) - gridStartMin) / 60) * HOUR_HEIGHT;
                  const height = Math.max(32, ((toMinutes(p.endTime) - toMinutes(p.startTime)) / 60) * HOUR_HEIGHT);
                  return (
                    <div
                      key={p.id}
                      onClick={p.onClick}
                      role={p.onClick ? "button" : undefined}
                      className={`absolute left-0.5 right-0.5 rounded-md px-1.5 py-1 text-left text-white overflow-hidden ${p.onClick ? "cursor-pointer hover:brightness-95" : ""}`}
                      style={{ top, height, backgroundColor: p.color }}
                    >
                      <p className="text-[11px] font-semibold leading-tight truncate">{p.title}</p>
                      {p.subtitle && <p className="text-[10px] leading-tight opacity-90 truncate">{p.subtitle}</p>}
                      <p className="text-[10px] leading-tight opacity-80 truncate">
                        {p.startTime}–{p.endTime}
                      </p>
                    </div>
                  );
                })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
