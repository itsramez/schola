import { Bus, GraduationCap, Megaphone, PartyPopper, School, Users } from "lucide-react";
import { useAppData } from "../store/AppDataContext";
import { useRole } from "../store/RoleContext";
import { formatFullDate } from "../dateUtils";
import type { AnnouncementCategory } from "../types";

const CATEGORY_STYLE: Record<AnnouncementCategory, { icon: typeof School; className: string }> = {
  general: { icon: Megaphone, className: "bg-navy/10 text-navy" },
  transport: { icon: Bus, className: "bg-amber-50 text-amber-600" },
  event: { icon: PartyPopper, className: "bg-pink-50 text-pink-500" },
  academic: { icon: GraduationCap, className: "bg-blue/10 text-blue" },
  closure: { icon: School, className: "bg-red-50 text-red-500" },
};

const AUDIENCE_ICON: Record<string, typeof Users> = {
  school: Users,
  grade: GraduationCap,
  class: GraduationCap,
  students: Users,
};

export default function Announcements() {
  const { role } = useRole();
  const { announcements, announcementsForParent } = useAppData();
  const visible = role === "parent" ? announcementsForParent : announcements;

  return (
    <div className="space-y-6">
      <header>
        <div className="flex items-center gap-2 text-navy">
          <Megaphone className="h-6 w-6" />
          <h1 className="text-2xl font-bold">School News</h1>
        </div>
        <p className="text-slate-500 mt-1">Announcements from Schola Academy, newest first.</p>
      </header>

      <div className="space-y-3">
        {visible.map((a) => {
          const style = CATEGORY_STYLE[a.category];
          const Icon = style.icon;
          const AudienceIcon = AUDIENCE_ICON[a.audience.type] ?? Users;
          return (
            <div
              key={a.id}
              className={`flex gap-3 rounded-xl border p-4 ${
                a.important ? "border-navy/15 bg-navy/5" : "border-slate-200 bg-white"
              }`}
            >
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${style.className}`}
              >
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="font-semibold text-navy">{a.title}</h2>
                  {a.important && (
                    <span className="shrink-0 rounded-full bg-blue text-white text-[11px] font-semibold px-2 py-0.5">
                      Important
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-600 mt-1">{a.body}</p>
                <div className="flex items-center gap-2 mt-2 text-xs text-slate-400">
                  <span className="inline-flex items-center gap-1">
                    <AudienceIcon className="h-3 w-3" />
                    {a.audience.label}
                  </span>
                  <span>·</span>
                  <span>{formatFullDate(a.date)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
