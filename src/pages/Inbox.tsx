import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCheck, Circle, Inbox as InboxIcon } from "lucide-react";
import { SEVERITY_STYLE, useNotifications } from "../hooks/useNotifications";
import { relativeDayLabel, inboxBucket } from "../dateUtils";

type Tab = "today" | "week" | "earlier";

const TABS: { key: Tab; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "week", label: "This Week" },
  { key: "earlier", label: "Earlier" },
];

export default function Inbox() {
  const { items, unreadItems, dismiss, markUnread, dismissAll } = useNotifications();
  const [tab, setTab] = useState<Tab>("today");

  const buckets = useMemo(() => {
    const grouped: Record<Tab, typeof items> = { today: [], week: [], earlier: [] };
    for (const item of items) {
      grouped[inboxBucket(item.groupTimestamp)].push(item);
    }
    return grouped;
  }, [items]);

  const activeItems = buckets[tab];

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-navy">
          <InboxIcon className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Inbox</h1>
        </div>
        {unreadItems.length > 0 && (
          <button
            onClick={dismissAll}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-blue hover:bg-blue/5"
          >
            <CheckCheck className="h-4 w-4" />
            Mark all read
          </button>
        )}
      </header>

      <div className="flex gap-2">
        {TABS.map((t) => {
          const unreadInTab = buckets[t.key].filter((i) => !i.read).length;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                tab === t.key
                  ? "bg-navy text-white"
                  : "bg-white text-slate-500 border border-slate-200 hover:border-navy/30"
              }`}
            >
              {t.label}
              {unreadInTab > 0 && (
                <span
                  className={`flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[10px] font-bold ${
                    tab === t.key ? "bg-white/20 text-white" : "bg-red-500 text-white"
                  }`}
                >
                  {unreadInTab}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {activeItems.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-400">
          {tab === "today"
            ? "Nothing new today. You're all caught up!"
            : tab === "week"
              ? "No notifications from earlier this week."
              : "No older notifications."}
        </div>
      ) : (
        <div className="space-y-2">
          {activeItems.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.id}
                className={`flex items-start gap-3 rounded-xl border bg-white p-3.5 transition-colors ${
                  item.read ? "border-slate-100 opacity-60" : "border-slate-200"
                }`}
              >
                <span
                  className={`mt-2 h-2.5 w-2.5 shrink-0 rounded-full ${SEVERITY_STYLE[item.severity].dot}`}
                  title={item.severity}
                />
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                  style={{ backgroundColor: `${item.accentColor}1A`, color: item.accentColor }}
                >
                  <Icon className="h-4.5 w-4.5" />
                </div>
                <Link to={item.link} onClick={() => dismiss(item.id)} className="min-w-0 flex-1">
                  <p
                    className={`text-sm leading-snug ${item.read ? "text-slate-500" : "font-semibold text-slate-800"}`}
                  >
                    {item.title}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{item.description}</p>
                </Link>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <span className="text-[11px] text-slate-400">{relativeDayLabel(item.timestamp)}</span>
                  <button
                    onClick={() => (item.read ? markUnread(item.id) : dismiss(item.id))}
                    title={item.read ? "Mark as unread" : "Mark as read"}
                    className="flex h-6 w-6 items-center justify-center rounded-full text-slate-300 hover:bg-slate-100 hover:text-blue"
                  >
                    {item.read ? <Circle className="h-3.5 w-3.5" /> : <CheckCheck className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
