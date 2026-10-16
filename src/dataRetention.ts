import type { Assignment } from "./types";
import { nowLocalIso } from "./dateUtils";

/**
 * Auto-purges the heavy part of old records — the embedded file bytes — while permanently
 * keeping the parts a school actually needs to retain: grades, feedback, titles, and dates.
 * This is what keeps storage usage bounded over a school year, not deleting the records
 * themselves (which schools generally need to keep for report cards and accountability).
 */

const GRADED_RETENTION_DAYS = 14;
const STALE_RETENTION_DAYS = 90;

function daysSince(iso: string): number {
  const then = new Date(iso.length > 10 ? iso : `${iso}T00:00:00`).getTime();
  return (Date.now() - then) / (1000 * 60 * 60 * 24);
}

export interface RetentionResult {
  assignments: Assignment[];
  purgedCount: number;
}

export function applyRetentionPolicy(assignments: Assignment[]): RetentionResult {
  let purgedCount = 0;
  const removedAt = nowLocalIso();

  const cleaned = assignments.map((a) => {
    const gradedAndPastGrace =
      a.review?.status === "graded" && daysSince(a.review.reviewedAt) > GRADED_RETENTION_DAYS;
    const assignmentIsStale = daysSince(a.dueDate) > STALE_RETENTION_DAYS;
    const shouldPurgeThisAssignment = gradedAndPastGrace || assignmentIsStale;

    let attachments = a.attachments;
    let touched = false;

    if (shouldPurgeThisAssignment && attachments.some((att) => att.dataUrl)) {
      attachments = attachments.map((att) =>
        att.dataUrl ? { ...att, dataUrl: undefined, fileRemovedAt: removedAt } : att,
      );
      touched = true;
    }

    let submission = a.submission;
    const submissionIsStale = submission?.dataUrl && daysSince(submission.submittedAt) > STALE_RETENTION_DAYS;
    if (submission?.dataUrl && (gradedAndPastGrace || submissionIsStale)) {
      submission = { ...submission, dataUrl: undefined, fileRemovedAt: removedAt };
      touched = true;
    }

    if (!touched) return a;
    purgedCount++;
    return { ...a, attachments, submission };
  });

  return { assignments: cleaned, purgedCount };
}
