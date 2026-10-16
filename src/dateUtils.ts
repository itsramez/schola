function startOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function today(): Date {
  return startOfDay(new Date());
}

export function parseDate(iso: string): Date {
  return startOfDay(new Date(`${iso}T00:00:00`));
}

export function daysUntil(iso: string): number {
  const diff = parseDate(iso).getTime() - today().getTime();
  return Math.round(diff / (1000 * 60 * 60 * 24));
}

export function addDays(iso: string, delta: number): string {
  const d = parseDate(iso);
  d.setDate(d.getDate() + delta);
  return toIsoDate(d);
}

export function isToday(iso: string): boolean {
  return daysUntil(iso) === 0;
}

export function isPast(iso: string): boolean {
  return daysUntil(iso) < 0;
}

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export function formatDueLabel(iso: string): string {
  const diff = daysUntil(iso);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  if (diff < 0) return `Overdue · ${WEEKDAYS[parseDate(iso).getDay()]}`;
  if (diff > 0 && diff <= 6) return WEEKDAYS[parseDate(iso).getDay()];
  const d = parseDate(iso);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

export function formatFullDate(iso: string): string {
  const d = parseDate(iso);
  return `${WEEKDAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

export function weekdayIndexToName(day: number): string {
  return WEEKDAYS[day];
}

export function monthName(month: number): string {
  return [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ][month];
}

/** A Date's local calendar date as YYYY-MM-DD — avoids the UTC-shift that toISOString() would introduce. */
export function toIsoDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateTime(iso: string): Date {
  return new Date(iso.length > 10 ? iso : `${iso}T00:00:00`);
}

export function formatMessageTime(iso: string): string {
  const d = parseDateTime(iso);
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, "0");
  const suffix = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  return `${hours}:${minutes} ${suffix}`;
}

export function formatMessageDay(iso: string): string {
  const d = startOfDay(parseDateTime(iso));
  const diff = Math.round((d.getTime() - today().getTime()) / (1000 * 60 * 60 * 24));
  if (diff === 0) return "Today";
  if (diff === -1) return "Yesterday";
  return `${WEEKDAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

export function isWithinHours(iso: string, start: string, end: string): boolean {
  const [h, m] = iso.split(":").map(Number);
  const nowMinutes = h * 60 + m;
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  return nowMinutes >= sh * 60 + sm && nowMinutes <= eh * 60 + em;
}

export function currentTimeHHMM(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** Short relative label for a date or datetime string, e.g. "Today", "In 2d", "3d ago". */
export function relativeDayLabel(timestamp: string): string {
  const dateOnly = timestamp.length > 10 ? timestamp.slice(0, 10) : timestamp;
  const d = daysUntil(dateOnly);
  if (d === 0) return "Today";
  if (d === 1) return "Tomorrow";
  if (d === -1) return "Yesterday";
  if (d < 0) return `${Math.abs(d)}d ago`;
  return `In ${d}d`;
}

/** Buckets a group-timestamp into the inbox's Today / This Week / Earlier tabs. */
export function inboxBucket(groupTimestamp: string): "today" | "week" | "earlier" {
  const dateOnly = groupTimestamp.length > 10 ? groupTimestamp.slice(0, 10) : groupTimestamp;
  const d = daysUntil(dateOnly);
  if (d >= 0) return "today";
  if (d >= -6) return "week";
  return "earlier";
}

export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

/** Local "now" as YYYY-MM-DDTHH:mm — avoids the UTC-shift that toISOString() would introduce. */
export function nowLocalIso(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}
