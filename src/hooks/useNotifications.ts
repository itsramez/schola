import { useEffect, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Award,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  FileQuestion,
  Megaphone,
  MessageSquare,
  RotateCcw,
} from "lucide-react";
import { useAppData } from "../store/AppDataContext";
import { CURRENT_STUDENT_NAME, useMessaging } from "../store/MessagingContext";
import { CURRENT_STUDENT_ID } from "../data/mockData";
import { useAuth } from "../store/AuthContext";
import { isSupabaseConfigured } from "../lib/supabaseClient";
import { daysUntil, nowLocalIso } from "../dateUtils";

export type NotificationCategory = "assignment" | "announcement" | "exam" | "message" | "success";
export type NotificationSeverity = "urgent" | "warning" | "info" | "success";

export const SEVERITY_STYLE: Record<NotificationSeverity, { dot: string; emoji: string }> = {
  urgent: { dot: "bg-red-500", emoji: "🔴" },
  warning: { dot: "bg-amber-500", emoji: "🟠" },
  info: { dot: "bg-blue", emoji: "🔵" },
  success: { dot: "bg-mint", emoji: "🟢" },
};

export interface NotificationItem {
  id: string;
  category: NotificationCategory;
  severity: NotificationSeverity;
  icon: LucideIcon;
  title: string;
  description: string;
  /** target/event date shown as the relative label (e.g. "in 2d") */
  timestamp: string;
  /** when this notification should be considered to have "arrived", for Today/This Week/Earlier grouping */
  groupTimestamp: string;
  link: string;
  accentColor: string;
  read: boolean;
}

const DISMISSED_KEY = "schola.notifications.dismissed.v1";
const RECENT_MESSAGE_WINDOW_DAYS = 3;

function loadDismissed(): Set<string> {
  try {
    const raw = localStorage.getItem(DISMISSED_KEY);
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch {
    return new Set();
  }
}

function toDate(timestamp: string): Date {
  return new Date(timestamp.length > 10 ? timestamp : `${timestamp}T00:00:00`);
}

function isRecent(timestamp: string, maxDays: number): boolean {
  const diffMs = Date.now() - toDate(timestamp).getTime();
  return diffMs <= maxDays * 24 * 60 * 60 * 1000;
}

type RawItem = Omit<NotificationItem, "read">;

export function useNotifications() {
  const { assignments, quizzes, announcements, tests, getSubject } = useAppData();
  const { profile } = useAuth();
  const isReal = isSupabaseConfigured && !!profile;
  const myName = isReal ? profile!.name : CURRENT_STUDENT_NAME;
  const {
    channels,
    conversations,
    channelMessages,
    directMessages,
    channelLastRead,
    conversationLastRead,
  } = useMessaging();
  const [dismissed, setDismissed] = useState<Set<string>>(() => loadDismissed());

  useEffect(() => {
    try {
      localStorage.setItem(DISMISSED_KEY, JSON.stringify(Array.from(dismissed)));
    } catch {
      // ignore storage errors
    }
  }, [dismissed]);

  const rawItems: RawItem[] = useMemo(() => {
    const list: RawItem[] = [];
    const now = nowLocalIso();

    for (const a of assignments) {
      const subject = getSubject(a.subjectId);

      if (a.createdAt && isRecent(a.createdAt, RECENT_MESSAGE_WINDOW_DAYS)) {
        list.push({
          id: `posted-${a.id}-${a.createdAt}`,
          category: "assignment",
          severity: "info",
          icon: ClipboardList,
          title: `New assignment: ${subject?.name ?? "Class"}`,
          description: a.title,
          timestamp: a.createdAt,
          groupTimestamp: a.createdAt,
          link: "/agenda",
          accentColor: subject?.color ?? "#2563EB",
        });
      }

      if (a.status !== "completed") {
        const d = daysUntil(a.dueDate);
        if (d >= 0 && d <= 1) {
          list.push({
            id: `due-${a.id}-${a.dueDate}`,
            category: "assignment",
            severity: "urgent",
            icon: ClipboardList,
            title: `${subject?.name ?? "Assignment"} homework due ${d === 0 ? "today" : "tomorrow"}`,
            description: a.title,
            timestamp: a.dueDate,
            groupTimestamp: now,
            link: "/agenda",
            accentColor: subject?.color ?? "#2563EB",
          });
        }
      }

      if (a.review?.status === "resubmit") {
        list.push({
          id: `resubmit-${a.id}-${a.review.reviewedAt}`,
          category: "assignment",
          severity: "urgent",
          icon: RotateCcw,
          title: `Resubmission requested: ${a.title}`,
          description: a.review.feedback,
          timestamp: a.review.reviewedAt,
          groupTimestamp: a.review.reviewedAt,
          link: "/agenda",
          accentColor: subject?.color ?? "#F59E0B",
        });
      }

      if (a.review?.status === "graded") {
        list.push({
          id: `graded-${a.id}-${a.review.reviewedAt}`,
          category: "success",
          severity: "success",
          icon: Award,
          title: `${a.title} was graded`,
          description:
            a.review.score !== undefined
              ? `${a.review.score}/${a.review.outOf} — ${a.review.feedback}`
              : a.review.feedback,
          timestamp: a.review.reviewedAt,
          groupTimestamp: a.review.reviewedAt,
          link: "/agenda",
          accentColor: subject?.color ?? "#10B981",
        });
      }

      if (
        a.submission &&
        a.review?.status !== "resubmit" &&
        isRecent(a.submission.submittedAt, RECENT_MESSAGE_WINDOW_DAYS)
      ) {
        list.push({
          id: `submitted-${a.id}-${a.submission.submittedAt}`,
          category: "success",
          severity: "success",
          icon: CheckCircle2,
          title: "Assignment submitted successfully",
          description: a.title,
          timestamp: a.submission.submittedAt,
          groupTimestamp: a.submission.submittedAt,
          link: "/agenda",
          accentColor: subject?.color ?? "#10B981",
        });
      }
    }

    for (const q of quizzes) {
      if (q.createdAt && isRecent(q.createdAt, RECENT_MESSAGE_WINDOW_DAYS)) {
        list.push({
          id: `posted-quiz-${q.id}-${q.createdAt}`,
          category: "assignment",
          severity: "info",
          icon: FileQuestion,
          title: `New quiz: ${q.subjectLabel}`,
          description: q.title,
          timestamp: q.createdAt,
          groupTimestamp: q.createdAt,
          link: "/quizzes",
          accentColor: "#2563EB",
        });
      }
    }

    for (const t of tests) {
      const subject = getSubject(t.subjectId);

      if (t.createdAt && isRecent(t.createdAt, RECENT_MESSAGE_WINDOW_DAYS)) {
        list.push({
          id: `posted-exam-${t.id}-${t.createdAt}`,
          category: "exam",
          severity: "info",
          icon: CalendarClock,
          title: `New ${t.kind ?? "exam"} scheduled: ${subject?.name ?? "Class"}`,
          description: `${t.title} — ${t.date}`,
          timestamp: t.createdAt,
          groupTimestamp: t.createdAt,
          link: "/calendar",
          accentColor: subject?.color ?? "#F59E0B",
        });
      }

      const d = daysUntil(t.date);
      if (d >= 0 && d <= 3) {
        list.push({
          id: `exam-${t.id}`,
          category: "exam",
          severity: "warning",
          icon: CalendarClock,
          title: `${subject?.name ?? "Exam"} ${(t.kind ?? "exam") === "quiz" ? "quiz" : (t.kind ?? "exam")} in ${d === 0 ? "today" : d === 1 ? "1 day" : `${d} days`}`,
          description: t.title,
          timestamp: t.date,
          groupTimestamp: now,
          link: "/calendar",
          accentColor: subject?.color ?? "#F59E0B",
        });
      }
    }

    for (const an of announcements) {
      list.push({
        id: `announcement-${an.id}`,
        category: "announcement",
        severity: "info",
        icon: Megaphone,
        title: `${an.title}`,
        description: an.body,
        timestamp: an.date,
        groupTimestamp: an.date,
        link: "/announcements",
        accentColor: "#2563EB",
      });
    }

    for (const c of channels) {
      const lastRead = channelLastRead[c.id];
      const unread = channelMessages
        .filter((m) => m.channelId === c.id && m.authorName !== myName)
        .filter((m) => (lastRead ? m.timestamp > lastRead : isRecent(m.timestamp, RECENT_MESSAGE_WINDOW_DAYS)))
        .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
      if (unread.length === 0) continue;
      const subject = getSubject(c.subjectId);
      const channelName = c.real?.label ?? subject?.name ?? "";
      const latest = unread[unread.length - 1];
      list.push({
        id: `channel-${c.id}-${latest.id}`,
        category: "message",
        severity: "info",
        icon: MessageSquare,
        title: `${latest.authorName} posted in ${channelName} — ${c.section}`,
        description: unread.length > 1 ? `${unread.length} new messages — ${latest.body}` : latest.body,
        timestamp: latest.timestamp,
        groupTimestamp: latest.timestamp,
        link: "/messages",
        accentColor: c.real?.color ?? subject?.color ?? "#2563EB",
      });
    }

    const myConversations = conversations.filter(
      (c) =>
        c.kind === "student-teacher" ||
        c.kind === "real-dm" ||
        (c.kind === "admin-student" && c.studentId === CURRENT_STUDENT_ID),
    );
    for (const conv of myConversations) {
      const lastRead = conversationLastRead[conv.id];
      const unread = directMessages
        .filter((m) => m.conversationId === conv.id && m.senderRole !== "student")
        .filter((m) => (lastRead ? m.timestamp > lastRead : isRecent(m.timestamp, RECENT_MESSAGE_WINDOW_DAYS)))
        .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
      if (unread.length === 0) continue;
      const subject = conv.subjectId ? getSubject(conv.subjectId) : undefined;
      const senderLabel = conv.real?.otherUserName ?? (conv.kind === "admin-student" ? "School Administration" : subject?.teacher ?? "Your teacher");
      const latest = unread[unread.length - 1];
      list.push({
        id: `conversation-${conv.id}-${latest.id}`,
        category: "message",
        severity: "info",
        icon: MessageSquare,
        title: `${senderLabel} sent you a message`,
        description: unread.length > 1 ? `${unread.length} new messages — ${latest.body}` : latest.body,
        timestamp: latest.timestamp,
        groupTimestamp: latest.timestamp,
        link: "/messages",
        accentColor: subject?.color ?? "#172554",
      });
    }

    return list.sort((a, b) => b.groupTimestamp.localeCompare(a.groupTimestamp));
  }, [
    assignments,
    quizzes,
    announcements,
    tests,
    isReal,
    myName,
    channels,
    conversations,
    channelMessages,
    directMessages,
    channelLastRead,
    conversationLastRead,
    getSubject,
  ]);

  const items: NotificationItem[] = rawItems.map((item) => ({ ...item, read: dismissed.has(item.id) }));
  const unreadItems = items.filter((n) => !n.read);

  const dismiss = (id: string) => setDismissed((prev) => new Set(prev).add(id));

  const markUnread = (id: string) =>
    setDismissed((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });

  const dismissAll = () =>
    setDismissed((prev) => {
      const next = new Set(prev);
      for (const item of items) next.add(item.id);
      return next;
    });

  return { items, unreadItems, dismiss, markUnread, dismissAll };
}
