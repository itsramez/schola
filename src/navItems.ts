import {
  Bell,
  BookOpen,
  Calendar,
  CheckSquare,
  ClipboardList,
  FileQuestion,
  Home,
  LineChart,
  Megaphone,
  MessageSquare,
  NotebookPen,
  Receipt,
  User,
  Users2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { UserRole } from "./types";

export interface NavItem {
  label: string;
  path: string;
  icon: LucideIcon;
  /** When set, this item is hidden unless the owner has turned the matching feature on for the school. */
  requiresFeature?: "fees";
}

export const navItems: NavItem[] = [
  { label: "Home", path: "/", icon: Home },
  { label: "Inbox", path: "/inbox", icon: Bell },
  { label: "Agenda", path: "/agenda", icon: NotebookPen },
  { label: "Classes", path: "/classes", icon: BookOpen },
  { label: "Assignments", path: "/assignments", icon: ClipboardList },
  { label: "Testing", path: "/quizzes", icon: FileQuestion },
  { label: "Messages", path: "/messages", icon: MessageSquare },
  { label: "Announcements", path: "/announcements", icon: Megaphone },
  { label: "Calendar", path: "/calendar", icon: Calendar },
  { label: "Profile", path: "/profile", icon: User },
];

export const bottomNavItems: NavItem[] = [
  { label: "Home", path: "/", icon: Home },
  { label: "Agenda", path: "/agenda", icon: NotebookPen },
  { label: "Inbox", path: "/inbox", icon: Bell },
  { label: "Profile", path: "/profile", icon: User },
];

/** Everything not pinned in the bottom nav's primary slots — reachable via its "More" sheet on mobile. */
export const moreNavItems: NavItem[] = [
  { label: "Classes", path: "/classes", icon: BookOpen },
  { label: "Assignments", path: "/assignments", icon: ClipboardList },
  { label: "Testing", path: "/quizzes", icon: FileQuestion },
  { label: "Messages", path: "/messages", icon: MessageSquare },
  { label: "Announcements", path: "/announcements", icon: Megaphone },
  { label: "Calendar", path: "/calendar", icon: Calendar },
];

/** Teacher has its dashboard, assignments, testing (quizzes + exams), insights, messages (class chat + admin/student DMs), and profile. */
export const staffNavItems: NavItem[] = [
  { label: "Home", path: "/", icon: Home },
  { label: "Assignments", path: "/teacher-assignments", icon: ClipboardList },
  { label: "Testing", path: "/teacher-quizzes", icon: FileQuestion },
  { label: "Insights", path: "/teacher-insights", icon: LineChart },
  { label: "Messages", path: "/messages", icon: MessageSquare },
  { label: "Profile", path: "/profile", icon: User },
];

/** Full admin sidebar — a dedicated page per management area, plus a school-wide Insights page. */
export const adminNavItems: NavItem[] = [
  { label: "Home", path: "/", icon: Home },
  { label: "People", path: "/admin-people", icon: Users2 },
  { label: "Academics", path: "/admin-academics", icon: BookOpen },
  { label: "Calendar", path: "/admin-calendar", icon: Calendar },
  { label: "Attendance", path: "/admin-attendance", icon: CheckSquare },
  { label: "Fees", path: "/admin-fees", icon: Receipt, requiresFeature: "fees" },
  { label: "Announcements", path: "/admin-announcements", icon: Megaphone },
  { label: "Insights", path: "/admin-insights", icon: LineChart },
  { label: "Messages", path: "/messages", icon: MessageSquare },
  { label: "Profile", path: "/profile", icon: User },
];

/** Compact mobile bottom nav for admin — the rest live in the "More" sheet. */
export const adminBottomNavItems: NavItem[] = [
  { label: "Home", path: "/", icon: Home },
  { label: "People", path: "/admin-people", icon: Users2 },
  { label: "Messages", path: "/messages", icon: MessageSquare },
  { label: "Profile", path: "/profile", icon: User },
];

export const adminMoreNavItems: NavItem[] = [
  { label: "Academics", path: "/admin-academics", icon: BookOpen },
  { label: "Calendar", path: "/admin-calendar", icon: Calendar },
  { label: "Attendance", path: "/admin-attendance", icon: CheckSquare },
  { label: "Fees", path: "/admin-fees", icon: Receipt, requiresFeature: "fees" },
  { label: "Announcements", path: "/admin-announcements", icon: Megaphone },
  { label: "Insights", path: "/admin-insights", icon: LineChart },
];

/** Parent can see their child's calendar, announcements, and a read-only view of their child's messages. */
export const parentNavItems: NavItem[] = [
  { label: "Home", path: "/", icon: Home },
  { label: "Calendar", path: "/calendar", icon: Calendar },
  { label: "Announcements", path: "/announcements", icon: Megaphone },
  { label: "Messages", path: "/messages", icon: MessageSquare },
  { label: "Profile", path: "/profile", icon: User },
];

const SIDEBAR_NAV: Record<UserRole, NavItem[]> = {
  student: navItems,
  teacher: staffNavItems,
  admin: adminNavItems,
  parent: parentNavItems,
};

const BOTTOM_NAV: Record<UserRole, NavItem[]> = {
  student: bottomNavItems,
  teacher: staffNavItems,
  admin: adminBottomNavItems,
  parent: parentNavItems,
};

const MORE_NAV: Record<UserRole, NavItem[]> = {
  student: moreNavItems,
  teacher: [],
  admin: adminMoreNavItems,
  parent: [],
};

export function navItemsForRole(role: UserRole): NavItem[] {
  return SIDEBAR_NAV[role];
}

export function bottomNavItemsForRole(role: UserRole): NavItem[] {
  return BOTTOM_NAV[role];
}

export function moreNavItemsForRole(role: UserRole): NavItem[] {
  return MORE_NAV[role];
}
