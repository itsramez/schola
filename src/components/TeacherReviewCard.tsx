import { Award, RotateCcw } from "lucide-react";
import type { TeacherReview } from "../types";
import { formatFullDate } from "../dateUtils";

export default function TeacherReviewCard({
  review,
  teacher,
}: {
  review: TeacherReview;
  teacher: string;
}) {
  const isResubmit = review.status === "resubmit";

  return (
    <div
      className={`rounded-lg border p-3 ${
        isResubmit ? "border-amber-200 bg-amber-50" : "border-mint/30 bg-mint/5"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <p
          className={`flex items-center gap-1.5 text-sm font-semibold ${
            isResubmit ? "text-amber-700" : "text-mint"
          }`}
        >
          {isResubmit ? <RotateCcw className="h-4 w-4" /> : <Award className="h-4 w-4" />}
          {isResubmit ? "Resubmission requested" : "Graded"}
        </p>
        {!isResubmit && review.score !== undefined && review.outOf !== undefined && (
          <span className="rounded-full bg-mint text-white text-xs font-bold px-2.5 py-1">
            {review.score}/{review.outOf}
          </span>
        )}
      </div>
      <p className="text-sm text-slate-700 mt-1.5">{review.feedback}</p>
      <p className="text-[11px] text-slate-400 mt-1.5">
        {teacher} · {formatFullDate(review.reviewedAt.slice(0, 10))}
      </p>
    </div>
  );
}
