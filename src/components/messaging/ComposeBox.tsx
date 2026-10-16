import { useState } from "react";
import { Send } from "lucide-react";

interface ComposeBoxProps {
  onSend: (text: string) => Promise<boolean>;
  placeholder?: string;
}

export default function ComposeBox({ onSend, placeholder = "Write a message…" }: ComposeBoxProps) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [failed, setFailed] = useState(false);

  const submit = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    setFailed(false);
    const ok = await onSend(text);
    setSending(false);
    if (ok) {
      setText("");
    } else {
      setFailed(true);
    }
  };

  return (
    <div className="border-t border-slate-200 bg-white">
      {failed && (
        <p className="px-3 pt-2 text-xs font-medium text-red-500">
          Couldn't send that message — check your connection and try again.
        </p>
      )}
      <div className="flex items-center gap-2 p-3">
        <input
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            if (failed) setFailed(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
          placeholder={placeholder}
          className="flex-1 rounded-full border border-slate-200 px-4 py-2 text-sm outline-none focus:border-blue"
        />
        <button
          type="button"
          onClick={submit}
          disabled={!text.trim() || sending}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue text-white disabled:opacity-40"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
