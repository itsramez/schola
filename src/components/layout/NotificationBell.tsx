import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Bell, CheckCheck, Inbox } from "lucide-react";
import { SEVERITY_STYLE, useNotifications } from "../../hooks/useNotifications";
import { relativeDayLabel } from "../../dateUtils";

export default function NotificationBell() {
  const { unreadItems, dismiss, dismissAll } = useNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const count = unreadItems.length;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative flex h-9 w-9 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100"
        title="Notifications"
      >
        <Bell className="h-5 w-5" />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-30 mt-2 w-80 max-w-[90vw] rounded-xl border border-slate-200 bg-white shadow-lg overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <p className="font-semibold text-slate-800 text-sm">Notifications</p>
            {count > 0 && (
              <button
                onClick={dismissAll}
                className="flex items-center gap-1 text-xs font-medium text-blue hover:underline"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {count === 0 ? (
              <div className="py-10 text-center text-sm text-slate-400">
                You're all caught up! 🎉
              </div>
            ) : (
              unreadItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.id}
                    to={item.link}
                    onClick={() => {
                      dismiss(item.id);
                      setOpen(false);
                    }}
                    className="flex items-start gap-3 px-4 py-3 border-b border-slate-50 last:border-0 hover:bg-slate-50"
                  >
                    <span
                      className={`mt-2 h-2 w-2 shrink-0 rounded-full ${SEVERITY_STYLE[item.severity].dot}`}
                    />
                    <div
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg mt-0.5"
                      style={{ backgroundColor: `${item.accentColor}1A`, color: item.accentColor }}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-800 leading-snug">{item.title}</p>
                      <p className="text-xs text-slate-500 truncate">{item.description}</p>
                    </div>
                    <span className="shrink-0 text-[11px] text-slate-400 mt-0.5">
                      {relativeDayLabel(item.timestamp)}
                    </span>
                  </Link>
                );
              })
            )}
          </div>

          <Link
            to="/inbox"
            onClick={() => setOpen(false)}
            className="flex items-center justify-center gap-1.5 border-t border-slate-100 py-2.5 text-xs font-semibold text-blue hover:bg-slate-50"
          >
            <Inbox className="h-3.5 w-3.5" />
            View full inbox
          </Link>
        </div>
      )}
    </div>
  );
}
