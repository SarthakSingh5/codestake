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
    <nav className={`border-b-4 border-black sticky top-0 z-50 transition-colors duration-500 ${isHardcoreEnabled ? "bg-[#ff3333]" : "bg-[#ffcc00]"}`}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2 group bg-white border-4 border-black px-3 py-1 shadow-[4px_4px_0_0_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_0_#000] transition-all">
              <span className="text-xl font-black uppercase tracking-tighter text-black">CodeStake</span>
            </Link>
            
            <div className="hidden md:block">
              <div className="flex items-center space-x-2">
                <Link
                  href="/problems"
                  className="px-4 py-2 text-sm font-black uppercase text-black border-2 border-transparent hover:border-black hover:bg-white transition-colors"
                >
                  Arena
                </Link>
                <Link
                  href="/extension"
                  className="px-4 py-2 text-sm font-black uppercase text-black border-2 border-transparent hover:border-black hover:bg-white transition-colors"
                >
                  Extension
                </Link>
                {user && (
                  <>
                    <Link
                      href="/profile"
                      className="px-4 py-2 text-sm font-black uppercase text-black border-2 border-transparent hover:border-black hover:bg-white transition-colors"
                    >
                      Profile
                    </Link>
                    <Link
                      href="/wallet"
                      className="flex items-center gap-2 px-4 py-2 text-sm font-black uppercase text-black border-2 border-transparent hover:border-black hover:bg-white transition-colors"
                    >
                      Wallet
                      <span className="inline-flex items-center bg-white border-2 border-black px-2 py-0.5 text-xs font-black text-black">
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
                  className="bg-black text-white px-4 py-2 text-sm font-black uppercase border-2 border-black hover:bg-white hover:text-black transition-colors"
                >
                  Disconnect
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
