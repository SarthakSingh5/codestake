"use client";

import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import { Provider } from "@supabase/supabase-js";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type SocialProvider = {
  id: Provider;
  label: string;
  icon: React.ReactNode;
};

// ── Add / remove social providers here ──────────────────────────────────────
const SOCIAL_PROVIDERS: SocialProvider[] = [
  {
    id: "google",
    label: "Google",
    icon: (
      <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
      </svg>
    ),
  },
  // ── Uncomment to enable GitHub ───────────────────────────────────────────
  // {
  //   id: "github",
  //   label: "GitHub",
  //   icon: (
  //     <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
  //       <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
  //     </svg>
  //   ),
  // },
  // ── Uncomment to enable LinkedIn ─────────────────────────────────────────
  // {
  //   id: "linkedin_oidc",
  //   label: "LinkedIn",
  //   icon: (
  //     <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="#0A66C2" aria-hidden="true">
  //       <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
  //     </svg>
  //   ),
  // },
];
// ─────────────────────────────────────────────────────────────────────────────

type AuthFormProps = {
  mode: "signup" | "login";
};

export default function AuthForm({ mode }: AuthFormProps) {
  const supabase = getSupabaseBrowserClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<{ text: string; error: boolean } | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setStatus(null);

    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) {
        setStatus({ text: error.message, error: true });
      } else {
        router.push("/login");
      }
    } else {
      const { error, data } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setStatus({ text: error.message, error: true });
      } else {
        // Check role to redirect admin to /admin, users to /
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", data.user.id)
          .single() as { data: { role: string } | null };

        router.push(profile?.role === "admin" ? "/admin" : "/");
      }
    }

    setLoading(false);
  }

  async function handleSocialLogin(provider: Provider) {
    await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        skipBrowserRedirect: false,
      },
    });
  }

  const isSignup = mode === "signup";

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#02050b] via-[#050c1d] to-[#071426] flex items-center justify-center px-4">
      {/* Ambient glow */}
      <div
        className="pointer-events-none fixed -top-32 left-1/2 -translate-x-1/2 h-96 w-96 rounded-full blur-3xl opacity-20"
        style={{ background: "radial-gradient(circle, #6366f1 0%, transparent 70%)" }}
        aria-hidden="true"
      />

      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex flex-col items-center gap-3 group">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/20 ring-1 ring-indigo-400/30 shadow-lg shadow-indigo-900/30 transition group-hover:ring-indigo-400/60">
              <svg className="h-6 w-6 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-4-4h-1M9 20H4v-2a4 4 0 014-4h1m4-4a4 4 0 100-8 4 4 0 000 8z" />
              </svg>
            </div>
            <span className="text-xl font-bold tracking-tight text-white">CodeStake</span>
          </Link>
          <p className="mt-3 text-sm text-slate-400">
            {isSignup ? "Create your account" : "Welcome back"}
          </p>
        </div>

        {/* Card */}
        <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[#0b0f1e]/80 p-7 shadow-[0_35px_90px_rgba(2,6,23,0.7)] backdrop-blur">
          <div
            className="pointer-events-none absolute -top-12 -right-12 h-44 w-44 rounded-full blur-2xl opacity-15"
            style={{ background: "radial-gradient(circle, #818cf8 0%, transparent 70%)" }}
            aria-hidden="true"
          />

          {/* Email + password form */}
          <form id={`form-${mode}`} onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor={`${mode}-email`} className="block text-sm font-medium text-slate-300 mb-1.5">
                Email
              </label>
              <input
                id={`${mode}-email`}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@email.com"
                className="w-full rounded-2xl border border-white/10 bg-[#080d1a] px-3.5 py-2.5 text-sm text-white placeholder-slate-500 shadow-inner shadow-black/30 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/25 transition"
              />
            </div>
            <div>
              <label htmlFor={`${mode}-password`} className="block text-sm font-medium text-slate-300 mb-1.5">
                Password
              </label>
              <input
                id={`${mode}-password`}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                placeholder="At least 6 characters"
                className="w-full rounded-2xl border border-white/10 bg-[#080d1a] px-3.5 py-2.5 text-sm text-white placeholder-slate-500 shadow-inner shadow-black/30 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/25 transition"
              />
            </div>

            <button
              id={`btn-${mode}-submit`}
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-900/40 transition hover:bg-indigo-500 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Please wait…" : isSignup ? "Create account" : "Log in"}
            </button>

            {status && (
              <p
                className={`text-xs text-center ${status.error ? "text-red-400" : "text-emerald-400"}`}
                role="status"
                aria-live="polite"
              >
                {status.text}
              </p>
            )}
          </form>

          {/* Social providers */}
          {SOCIAL_PROVIDERS.length > 0 && (
            <>
              <div className="relative flex items-center gap-3 my-5">
                <div className="h-px flex-1 bg-white/10" />
                <span className="text-xs text-slate-500">or continue with</span>
                <div className="h-px flex-1 bg-white/10" />
              </div>

              <div className="flex flex-col gap-2.5">
                {SOCIAL_PROVIDERS.map((provider) => (
                  <button
                    key={provider.id}
                    id={`btn-${mode}-${provider.id}`}
                    type="button"
                    onClick={() => handleSocialLogin(provider.id)}
                    className="flex w-full items-center justify-center gap-2.5 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:bg-white/10 hover:text-white active:scale-[0.98]"
                  >
                    {provider.icon}
                    Continue with {provider.label}
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Switch mode */}
          <p className="mt-6 text-center text-xs text-slate-500">
            {isSignup ? "Already have an account? " : "Don't have an account? "}
            <Link
              href={isSignup ? "/login" : "/signup"}
              className="text-indigo-400 hover:text-indigo-300 font-medium transition"
            >
              {isSignup ? "Log in" : "Sign up"}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
