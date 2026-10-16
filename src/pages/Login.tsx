import { useState } from "react";
import type { FormEvent } from "react";
import { Navigate } from "react-router-dom";
import { GraduationCap, Loader2 } from "lucide-react";
import { useAuth } from "../store/AuthContext";
import { isSupabaseConfigured } from "../lib/supabaseClient";

/** Dev convenience only — every one of these shares the same password on this project. Remove before sharing this build publicly. */
const QUICK_LOGIN_PASSWORD = "a1984a1984";
const QUICK_LOGINS = [
  { label: "Owner", email: "ramezhaswe5@schola.edu" },
  { label: "Admin", email: "khoder@schola.edu" },
  { label: "Teacher", email: "amal@schola.edu" },
  { label: "Student", email: "hsein@schola.edu" },
  { label: "Parent", email: "Badi3a@schola.edu" },
];

export default function Login() {
  const { session, signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Already signed in (e.g. navigated here directly, or just finished signing in) — leave.
  if (session) return <Navigate to="/" replace />;

  const attemptSignIn = async (targetEmail: string, targetPassword: string) => {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    const { error: signInError } = await signIn(targetEmail, targetPassword);
    if (signInError) setError(signInError);
    setSubmitting(false);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    attemptSignIn(email.trim(), password);
  };

  const quickSignIn = (quickEmail: string) => {
    setEmail(quickEmail);
    setPassword(QUICK_LOGIN_PASSWORD);
    attemptSignIn(quickEmail, QUICK_LOGIN_PASSWORD);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue mb-3">
            <GraduationCap className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-xl font-bold text-navy">Schola</h1>
          <p className="text-sm text-slate-500 mt-1">Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
          <label className="block">
            <span className="block text-xs font-medium text-slate-500 mb-1">Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              placeholder="you@schola.edu"
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue"
            />
          </label>
          <label className="block">
            <span className="block text-xs font-medium text-slate-500 mb-1">Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue"
            />
          </label>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-blue px-4 py-2.5 text-sm font-semibold text-white hover:brightness-95 disabled:opacity-60"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {submitting ? "Signing in…" : "Sign in"}
          </button>
        </form>

        {isSupabaseConfigured && (
          <div className="mt-5">
            <p className="text-center text-xs text-slate-400 mb-2">Quick login (dev)</p>
            <div className="grid grid-cols-5 gap-1.5">
              {QUICK_LOGINS.map((q) => (
                <button
                  key={q.label}
                  type="button"
                  onClick={() => quickSignIn(q.email)}
                  disabled={submitting}
                  className="rounded-lg border border-slate-200 bg-white py-2 text-[11px] font-semibold text-slate-600 hover:border-blue/40 hover:text-blue disabled:opacity-50"
                >
                  {q.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <p className="text-center text-xs text-slate-400 mt-4">
          Accounts are created by your school administrator.
        </p>
      </div>
    </div>
  );
}
