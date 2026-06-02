import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import { redirect } from "next/navigation";
import Navbar from "../components/Navbar";
import Link from "next/link";
import DepositModal from "./DepositModal";

export const metadata = {
  title: "Wallet — CodeStake",
  description: "Manage your accountability stakes.",
};

function formatCurrency(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

function formatDate(isoString: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(isoString));
}

export default async function WalletPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Protect the route
  if (!user) {
    redirect("/login");
  }

  // Fetch the wallet balance
  const { data: wallet } = await supabase
    .from("wallets")
    .select("balance_cents")
    .eq("user_id", user.id)
    .single();

  const balance = wallet?.balance_cents ?? 0;

  // Fetch transactions
  const { data: transactions } = await supabase
    .from("transactions")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="min-h-screen bg-[#02050b] text-slate-100 flex flex-col">
      <Navbar />
      <main className="flex-1 relative overflow-hidden">
        {/* Ambient glow */}
        <div
          className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 h-96 w-full max-w-3xl rounded-full blur-[120px] opacity-20"
          style={{ background: "radial-gradient(ellipse, #10b981 0%, transparent 70%)" }}
          aria-hidden="true"
        />

        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-12 relative z-10">
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight text-white">Wallet</h1>
            <p className="mt-2 text-sm text-slate-400">
              Manage your funds and view your transaction history.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Balance Card */}
            <div className="md:col-span-1 rounded-2xl border border-white/10 bg-[#0b0f1e]/80 p-6 backdrop-blur flex flex-col relative overflow-hidden">
              {/* Subtle green glow inside card */}
              <div className="absolute -top-12 -right-12 w-32 h-32 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />
              
              <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-2">Available Balance</h2>
              <div className="text-4xl font-bold text-white mb-6">
                <span className="text-2xl text-slate-400 mr-2">🪙</span>
                {balance} <span className="text-lg text-slate-500 font-normal">Credits</span>
              </div>
              
              <DepositModal />
              <p className="text-center text-xs text-slate-500 mt-3">
                Secure payments via Stripe & Razorpay
              </p>
            </div>

            {/* Info Card */}
            <div className="md:col-span-2 rounded-2xl border border-white/10 bg-white/[0.02] p-6 flex flex-col justify-center">
              <h3 className="text-lg font-semibold text-white mb-3">How Hardcore Mode Works</h3>
              <ul className="space-y-3 text-sm text-slate-300">
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 mt-0.5">✓</span>
                  <span><strong>Deposit money</strong> to fund your accountability stakes.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 mt-0.5">✓</span>
                  <span><strong>Stake your money</strong> on a problem to lock yourself in.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 mt-0.5">✓</span>
                  <span><strong>Solve it</strong> in time, and your money is completely safe.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-400 mt-0.5">✗</span>
                  <span><strong>Fail or give up</strong>, and you lose the stake. No excuses.</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Transactions List */}
          <div className="rounded-2xl border border-white/10 bg-[#0b0f1e]/80 backdrop-blur overflow-hidden">
            <div className="px-6 py-4 border-b border-white/5 bg-white/[0.02]">
              <h3 className="text-lg font-medium text-white">Transaction History</h3>
            </div>
            
            {!transactions || transactions.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-sm">
                No transactions yet. Deposit funds to get started.
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {transactions.map((tx) => (
                  <div key={tx.id} className="px-6 py-4 flex items-center justify-between hover:bg-white/[0.02] transition">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-white capitalize">
                        {tx.type.replace("_", " ")}
                      </span>
                      <span className="text-xs text-slate-500 mt-0.5">
                        {formatDate(tx.created_at)}
                      </span>
                    </div>
                    <div className={`text-sm font-bold font-mono ${tx.amount_cents > 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {tx.amount_cents > 0 ? "+" : ""}{tx.amount_cents} <span className="text-xs text-slate-500 font-normal">Credits</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
