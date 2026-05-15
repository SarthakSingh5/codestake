import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";

export const metadata = {
  title: "CodeStake",
  description: "Compete. Solve. Win.",
};

export default async function Home() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  // If logged in, show the User Dashboard view
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    return (
      <div className="min-h-screen bg-gradient-to-br from-[#02050b] via-[#050c1d] to-[#071426] flex items-center justify-center px-4 text-slate-100">
        <div
          className="pointer-events-none fixed -top-32 left-1/2 -translate-x-1/2 h-96 w-96 rounded-full blur-3xl opacity-20"
          style={{ background: "radial-gradient(circle, #6366f1 0%, transparent 70%)" }}
          aria-hidden="true"
        />

        <div className="relative w-full max-w-md text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/20 ring-1 ring-indigo-400/30 shadow-lg shadow-indigo-900/30">
            <span className="text-2xl">👋</span>
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-white">Welcome back!</h1>
          <p className="mt-2 text-sm text-slate-400">Logged in as {user.email}</p>
          
          {(() => {
            // We fetch the profile to show the role on the UI
            // This is just for debugging so you can see your current role!
            return (
              <div className="mt-4 inline-block rounded-full bg-slate-800 px-3 py-1 text-xs font-medium text-slate-300">
                Current Role: <span className="text-white font-bold">{profile?.role || "user"}</span>
              </div>
            );
          })()}

          <div className="mt-10 grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-white/10 bg-[#0b0f1e]/80 p-5 backdrop-blur">
              <span className="text-sm text-slate-400 block mb-1">Your Rank</span>
              <span className="text-xl font-bold text-white">#42</span>
            </div>
            <div className="rounded-2xl border border-white/10 bg-[#0b0f1e]/80 p-5 backdrop-blur">
              <span className="text-sm text-slate-400 block mb-1">Points</span>
              <span className="text-xl font-bold text-white">1,337</span>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3">
            <form action="/auth/signout" method="POST">
              <button
                type="submit"
                className="w-full rounded-full border border-white/10 bg-white/[0.06] px-4 py-3 text-sm font-semibold text-slate-200 backdrop-blur transition hover:bg-white/10 hover:text-white active:scale-[0.98]"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // If logged out, show the Landing Page
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#02050b] via-[#050c1d] to-[#071426] flex items-center justify-center px-4 text-slate-100">
      {/* Ambient glow */}
      <div
        className="pointer-events-none fixed -top-32 left-1/2 -translate-x-1/2 h-96 w-96 rounded-full blur-3xl opacity-20"
        style={{ background: "radial-gradient(circle, #6366f1 0%, transparent 70%)" }}
        aria-hidden="true"
      />

      <div className="relative w-full max-w-xs text-center">
        {/* Logo */}
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/20 ring-1 ring-indigo-400/30 shadow-lg shadow-indigo-900/30">
          <svg className="h-7 w-7 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-4-4h-1M9 20H4v-2a4 4 0 014-4h1m4-4a4 4 0 100-8 4 4 0 000 8z" />
          </svg>
        </div>

        <h1 className="text-3xl font-bold tracking-tight text-white">CodeStake</h1>
        <p className="mt-2 text-sm text-slate-400">Compete. Solve. Win.</p>

        <div className="mt-10 flex flex-col gap-3">
          <Link
            id="btn-home-signup"
            href="/signup"
            className="w-full rounded-full bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-900/40 transition hover:bg-indigo-500 active:scale-[0.98]"
          >
            Create an account
          </Link>
          <Link
            id="btn-home-login"
            href="/login"
            className="w-full rounded-full border border-white/10 bg-white/[0.06] px-4 py-3 text-sm font-semibold text-slate-200 backdrop-blur transition hover:bg-white/10 hover:text-white active:scale-[0.98]"
          >
            Log in
          </Link>
        </div>
      </div>
    </div>
  );
}
