import { BarChart3, Check } from "lucide-react";
import type { Poll } from "../../types";

export default function PollCard({
  poll,
  onVote,
  readOnly = false,
}: {
  poll: Poll;
  onVote: (optionId: string) => void;
  readOnly?: boolean;
}) {
  const totalVotes = poll.options.reduce((sum, o) => sum + o.votes, 0);
  const hasVoted = Boolean(poll.votedOptionId) || readOnly;

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 mt-2">
      <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 mb-2">
        <BarChart3 className="h-3.5 w-3.5" />
        Poll
      </p>
      <div className="space-y-1.5">
        {poll.options.map((opt) => {
          const pct = totalVotes === 0 ? 0 : Math.round((opt.votes / totalVotes) * 100);
          const isSelected = poll.votedOptionId === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              disabled={hasVoted}
              onClick={() => onVote(opt.id)}
              className={`relative w-full overflow-hidden rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                isSelected ? "border-blue" : "border-slate-200"
              } ${hasVoted ? "cursor-default" : "cursor-pointer hover:border-blue/50"} bg-white`}
            >
              {hasVoted && (
                <span
                  className="absolute inset-y-0 left-0 bg-blue/10"
                  style={{ width: `${pct}%` }}
                />
              )}
              <span className="relative flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-slate-700">
                  {isSelected && <Check className="h-3.5 w-3.5 text-blue" />}
                  {opt.text}
                </span>
                {hasVoted && (
                  <span className="text-xs font-semibold text-slate-500 shrink-0">
                    {pct}% · {opt.votes}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>
      {!hasVoted && <p className="text-[11px] text-slate-400 mt-1.5">Tap an option to vote.</p>}
    </div>
  );
}
