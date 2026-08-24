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
    <div className="min-h-screen flex flex-col font-sans">
      <Navbar />
      <main className="flex-1 relative overflow-hidden">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-12 relative z-10">
          <div className="mb-8 border-l-8 border-[#ff3333] pl-6 py-2 bg-white border-y-4 border-r-4 border-black shadow-[4px_4px_0_0_#000]">
            <h1 className="text-4xl font-black uppercase tracking-tighter text-black">Wallet</h1>
            <p className="mt-2 text-sm text-black font-bold uppercase tracking-widest">
              Manage your funds and view your transaction history.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Balance Card */}
            <div className="md:col-span-1 nb-box p-6 flex flex-col relative overflow-hidden bg-[#ffcc00]">
              <h2 className="text-sm font-black text-black uppercase tracking-widest mb-2 bg-white inline-block border-2 border-black px-2 shadow-[2px_2px_0_0_#000]">Current Debt</h2>
              <div className="text-4xl font-black text-black mb-6 mt-4 tracking-tighter flex items-center bg-white p-3 border-4 border-black shadow-[inset_4px_4px_0_0_#000]">
                {balance < 0 ? (
                  <>
                    <span className="text-[#ff3333] mr-1">-$</span>
                    {Math.abs(balance / 100).toFixed(2)}
                  </>
                ) : (
                  <>
                    <span className="text-[#00ff66] mr-1">+$</span>
                    0.00
                  </>
                )}
              </div>
              
              {balance < 0 ? (
                <>
                  <DepositModal debtAmountCents={Math.abs(balance)} />
                  <p className="text-center text-xs text-white bg-black p-2 mt-3 font-black uppercase tracking-widest">
                    You are banished from the arena until paid.
                  </p>
                </>
              ) : (
                <div className="mt-auto bg-white border-4 border-black p-3 text-center shadow-[4px_4px_0_0_#000]">
                  <span className="text-black text-sm font-black uppercase tracking-widest flex items-center justify-center gap-2">
                    <svg className="w-5 h-5 text-[#00ff66]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" /></svg>
                    Clean Slate
                  </span>
                </div>
              )}
            </div>

            {/* Info Card */}
            <div className="md:col-span-2 nb-box p-6 flex flex-col justify-center bg-white">
              <h3 className="text-2xl font-black text-black mb-4 uppercase tracking-tighter bg-[#00ff66] inline-block w-fit px-2 border-2 border-black shadow-[2px_2px_0_0_#000] -rotate-1">How Hardcore Mode Works</h3>
              <ul className="space-y-4 text-sm text-black font-bold">
                <li className="flex items-start gap-3">
                  <span className="bg-[#00ff66] border-2 border-black w-6 h-6 flex items-center justify-center shadow-[2px_2px_0_0_#000] mt-0.5">✓</span>
                  <span><span className="bg-[#ffcc00] px-1 border-2 border-black shadow-[2px_2px_0_0_#000] mr-1">No Upfront Fees.</span> Place a stake instantly without depositing money.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="bg-[#00ff66] border-2 border-black w-6 h-6 flex items-center justify-center shadow-[2px_2px_0_0_#000] mt-0.5">✓</span>
                  <span><span className="bg-[#ffcc00] px-1 border-2 border-black shadow-[2px_2px_0_0_#000] mr-1">Solve it</span> in time, and your honor is intact. No money is lost.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="bg-[#ff3333] border-2 border-black text-white w-6 h-6 flex items-center justify-center shadow-[2px_2px_0_0_#000] mt-0.5">✗</span>
                  <span><span className="bg-black text-white px-1 border-2 border-black shadow-[2px_2px_0_0_#000] mr-1">Fail or give up</span>, and you incur a financial penalty (debt).</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="bg-[#ff3333] border-2 border-black text-white w-6 h-6 flex items-center justify-center shadow-[2px_2px_0_0_#000] mt-0.5">✗</span>
                  <span><span className="bg-black text-white px-1 border-2 border-black shadow-[2px_2px_0_0_#000] mr-1">The Banishment:</span> If you owe a debt, you are permanently locked out until you pay.</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Transactions List */}
          <div className="nb-box overflow-hidden bg-white">
            <div className="px-6 py-4 border-b-4 border-black bg-black text-white">
              <h3 className="text-xl font-black uppercase tracking-widest">Transaction History</h3>
            </div>
            
            {!transactions || transactions.length === 0 ? (
              <div className="p-8 text-center text-black font-bold uppercase tracking-widest">
                No transactions yet.
              </div>
            ) : (
              <div className="divide-y-4 divide-black">
                {transactions.map((tx) => {
                  const isDeposit = tx.amount_cents > 0;
                  return (
                    <div key={tx.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-100 transition">
                      <div className="flex flex-col">
                        <span className="text-lg font-black text-black uppercase tracking-tighter">
                          {tx.type.replace("_", " ")}
                        </span>
                        <span className="text-xs text-black font-bold mt-1 tracking-widest border-2 border-black px-1 w-fit">
                          {formatDate(tx.created_at)}
                        </span>
                      </div>
                      <div className={`font-black text-2xl text-right p-2 border-4 border-black shadow-[inset_2px_2px_0_0_#000] bg-white ${isDeposit ? 'text-[#00ff66]' : 'text-[#ff3333]'}`}>
                        {isDeposit ? '+' : ''}${(Math.abs(tx.amount_cents) / 100).toFixed(2)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
