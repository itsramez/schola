import type { Assignment, AttendanceRecord } from "./types";
import { isPast } from "./dateUtils";

const STREAK_THRESHOLD = 3;

export interface AbsenceStreakResult {
  streak: number;
  dates: string[];
  flagged: boolean;
}

/** Counts consecutive most-recent school days where the student was absent from every class. */
export function getAbsenceStreak(records: AttendanceRecord[]): AbsenceStreakResult {
  const byDate = new Map<string, AttendanceRecord[]>();
  for (const r of records) {
    const list = byDate.get(r.date) ?? [];
    list.push(r);
    byDate.set(r.date, list);
  }
  const days = Array.from(byDate.entries())
    .map(([date, recs]) => ({ date, allAbsent: recs.length > 0 && recs.every((r) => r.status === "absent") }))
    .sort((a, b) => b.date.localeCompare(a.date));

  const dates: string[] = [];
  for (const day of days) {
    if (!day.allAbsent) break;
    dates.push(day.date);
  }
  return { streak: dates.length, dates, flagged: dates.length >= STREAK_THRESHOLD };
}

export interface AssignmentStreakResult {
  streak: number;
  titles: string[];
  flagged: boolean;
}

/** Finds the longest run of consecutive (by due date) past-due assignments the student never completed. */
export function getMissedAssignmentStreak(assignments: Assignment[]): AssignmentStreakResult {
  const pastDue = assignments
    .filter((a) => isPast(a.dueDate))
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  let bestRun: Assignment[] = [];
  let currentRun: Assignment[] = [];
  for (const a of pastDue) {
    if (a.status !== "completed") {
      currentRun.push(a);
      if (currentRun.length > bestRun.length) bestRun = currentRun;
    } else {
      currentRun = [];
    }
  }

  return {
    streak: bestRun.length,
    titles: bestRun.map((a) => a.title),
    flagged: bestRun.length >= STREAK_THRESHOLD,
  };
}
