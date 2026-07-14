import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import { redirect } from "next/navigation";
import HardcoreToggle from "./HardcoreToggle";
import { lazyEvaluateExpiredStakes } from "@/app/actions/stake";

export default async function Navbar({ hideHardcoreToggle = false }: { hideHardcoreToggle?: boolean } = {}) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  let isHardcoreEnabled = false;
  let walletBalance = 0;

  if (user) {
    // 1. Lazy evaluation: Instantly fail any expired timers before showing the balance
    await lazyEvaluateExpiredStakes();

    const { data: profile } = await supabase
      .from("profiles")
      .select("is_hardcore_mode_enabled")
      .eq("id", user.id)
      .single();
    if (profile) isHardcoreEnabled = profile.is_hardcore_mode_enabled;

    const { data: wallet } = await supabase
      .from("wallets")
      .select("balance_cents")
      .eq("user_id", user.id)
      .single();
    if (wallet) walletBalance = wallet.balance_cents;
  }

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
  };

  return (
    <nav className={`border-b backdrop-blur sticky top-0 z-50 transition-colors duration-500 ${isHardcoreEnabled ? "border-red-900/50 bg-[#050101]/90" : "border-white/10 bg-[#02050b]/80"}`}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2 group">
              <div className={`flex h-8 w-8 items-center justify-center rounded-lg ring-1 shadow-lg transition ${isHardcoreEnabled ? "bg-red-500/20 ring-red-400/50 shadow-red-900/40" : "bg-indigo-500/20 ring-indigo-400/30 shadow-indigo-900/30 group-hover:ring-indigo-400/60"}`}>
                <svg className={`h-5 w-5 ${isHardcoreEnabled ? "text-red-400" : "text-indigo-400"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-4-4h-1M9 20H4v-2a4 4 0 014-4h1m4-4a4 4 0 100-8 4 4 0 000 8z" />
                </svg>
              </div>
              <span className="text-lg font-bold tracking-tight text-white">CodeStake</span>
            </Link>
            
            <div className="hidden md:block">
              <div className="flex items-center space-x-4">
                <Link
                  href="/problems"
                  className="rounded-md px-3 py-2 text-sm font-medium text-slate-300 hover:bg-white/5 hover:text-white transition"
                >
                  Problems
                </Link>
                <Link
                  href="/extension"
                  className="rounded-md px-3 py-2 text-sm font-medium text-slate-300 hover:bg-white/5 hover:text-white transition"
                >
                  Extension
                </Link>
                {user && (
                  <>
                    <Link
                      href="/profile"
                      className="rounded-md px-3 py-2 text-sm font-medium text-slate-300 hover:bg-white/5 hover:text-white transition"
                    >
                      Profile
                    </Link>
                    <Link
                      href="/wallet"
                      className="flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-slate-300 hover:bg-white/5 hover:text-white transition"
                    >
                    Wallet
                    <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-400 ring-1 ring-inset ring-emerald-500/20">
                      {formatCurrency(walletBalance)}
                    </span>
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            {user && !hideHardcoreToggle && <HardcoreToggle initialEnabled={isHardcoreEnabled} />}
            
            {user && (
              <form
                action={async () => {
                  "use server";
                  const supabase = await createSupabaseServerClient();
                  await supabase.auth.signOut();
                  redirect("/");
                }}
              >
                <button
                  type="submit"
                  className="rounded-lg bg-white/5 px-4 py-2 text-sm font-medium text-slate-300 ring-1 ring-white/10 transition hover:bg-white/10 hover:text-white"
                >
                  Sign out
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
