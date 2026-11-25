import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import { redirect } from "next/navigation";
import { internalSweepExpiredSessions, internalSweepExpiredContracts } from "@/lib/internalStake";
import Navbar from "../components/Navbar";
import DepositModal from "./DepositModal";
import LedgerClient, { LedgerItem } from "./LedgerClient";

export const metadata = {
  title: "Ledger — CodeStake",
  description: "Accountability ledger, capital defended under pressure, and settlement history.",
};

function formatCurrency(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
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

  // Sweep any expired timers before rendering
  await internalSweepExpiredSessions(user.id);
  await internalSweepExpiredContracts(user.id);

  // Fetch wallet, transactions, won sessions, and completed contracts in parallel
  const [
    { data: wallet },
    { data: transactions },
    { data: wonSessions },
    { data: completedContracts },
  ] = await Promise.all([
    supabase
      .from("wallets")
      .select("balance_cents, persona_score")
      .eq("user_id", user.id)
      .single(),
    supabase
      .from("transactions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("stake_sessions")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "won")
      .order("created_at", { ascending: false }),
    supabase
      .from("challenge_contracts")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "completed"),
  ]);

  const balance = wallet?.balance_cents ?? 0;

  // Gather UUID reference IDs to enrich contract and problem details
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const problemIdSet = new Set<string>();
  const contractIdSet = new Set<string>();

  (wonSessions ?? []).forEach((s) => s.problem_id && problemIdSet.add(s.problem_id));
  (transactions ?? []).forEach((tx) => {
    if (tx.reference_id && uuidRegex.test(tx.reference_id)) {
      problemIdSet.add(tx.reference_id);
      contractIdSet.add(tx.reference_id);
    }
  });

  let contractMap = new Map<string, any>();
  let problemMap = new Map<string, any>();

  const [contractsRes, problemsRes] = await Promise.all([
    contractIdSet.size > 0
      ? supabase
          .from("challenge_contracts")
          .select("id, mode, target_days, target_problems_per_day")
          .in("id", Array.from(contractIdSet))
      : Promise.resolve({ data: [] }),
    problemIdSet.size > 0
      ? supabase
          .from("problems")
          .select("id, title, slug")
          .in("id", Array.from(problemIdSet))
      : Promise.resolve({ data: [] }),
  ]);

  if (contractsRes.data) {
    contractMap = new Map(contractsRes.data.map((c: any) => [c.id, c]));
  }
  if (problemsRes.data) {
    problemMap = new Map(problemsRes.data.map((p: any) => [p.id, p]));
  }

  // Calculate totals
  const totalDefendedSessions = (wonSessions ?? []).reduce((sum, s) => sum + (s.amount_cents || 0), 0);
  const totalDefendedContracts = (completedContracts ?? []).reduce((sum, c) => sum + (c.penalty_cents || 0), 0);
  const totalDefended = totalDefendedSessions + totalDefendedContracts;
  const totalDefendedCount = (wonSessions?.length ?? 0) + (completedContracts?.length ?? 0);

  const lostTxList = (transactions ?? [])?.filter((tx) => tx.amount_cents < 0) ?? [];
  const totalLostCount = lostTxList.length;
  const totalStakes = totalDefendedCount + totalLostCount;
  const defenseRate = totalStakes > 0 ? Math.round((totalDefendedCount / totalStakes) * 100) : 100;

  // Build unified ledger items
  const unifiedItems: LedgerItem[] = [];

  // 1. Won Sessions (Capital Defended)
  for (const s of wonSessions ?? []) {
    const prob = problemMap.get(s.problem_id);
    unifiedItems.push({
      id: `won-${s.id}`,
      category: "defended",
      amount_cents: s.amount_cents,
      created_at: s.created_at,
      label: prob ? prob.title : "Quick Play Challenge",
      detail: s.mode === "one_shot" ? "One-Shot Stake Defended 🛡️" : "Time Crunch Stake Defended 🛡️",
      icon: "🛡️",
      tag: "DEFENDED",
      badgeBg: "bg-[#00ff66]",
      badgeText: "text-black",
      reference_id: s.problem_id,
    });
  }

  // 2. Won Contracts (Capital Defended)
  for (const c of completedContracts ?? []) {
    unifiedItems.push({
      id: `won-contract-${c.id}`,
      category: "defended",
      amount_cents: c.penalty_cents,
      created_at: c.last_updated_at || c.started_at,
      label: c.mode === "blood_pact" ? "Blood Pact Challenge" : "Gauntlet Challenge",
      detail: c.mode === "blood_pact" ? `${c.target_days}-Day Pact Completed 🏆` : "3-Hour Gauntlet Completed 🏆",
      icon: "🏆",
      tag: "DEFENDED",
      badgeBg: "bg-[#00ff66]",
      badgeText: "text-black",
      reference_id: c.id,
    });
  }

  // 3. Transactions (Capital Lost penalties only — deposits excluded from match history)
  for (const tx of transactions ?? []) {
    if (tx.amount_cents < 0) {
      const contract = tx.reference_id ? contractMap.get(tx.reference_id) : null;
      const prob = tx.reference_id ? problemMap.get(tx.reference_id) : null;

      let label = "Quick Play Challenge";
      let detail = "Single Problem Stake Timeout ⚡";
      let icon = "⚡";

      if (contract) {
        if (contract.mode === "blood_pact") {
          label = "Blood Pact Challenge";
          detail = `${contract.target_days}-Day Pact Missed 🩸`;
          icon = "🩸";
        } else {
          label = "Gauntlet Challenge";
          detail = `Target: ${contract.target_problems_per_day} problem${contract.target_problems_per_day > 1 ? "s" : ""} missed 🔥`;
          icon = "🔥";
        }
      } else if (prob) {
        label = prob.title;
        detail = "LeetCode Stake Penalty ⚡";
        icon = "⚡";
      } else if (Math.abs(tx.amount_cents) >= 5000) {
        label = "Gauntlet Challenge";
        detail = "3-Hour Gauntlet Timeout 🔥";
        icon = "🔥";
      }

      unifiedItems.push({
        id: tx.id,
        category: "lost",
        amount_cents: tx.amount_cents,
        created_at: tx.created_at,
        label,
        detail,
        icon,
        tag: "LOST",
        badgeBg: "bg-[#ff3333]",
        badgeText: "text-white",
        reference_id: tx.reference_id,
      });
    }
  }

  // Sort unified items descending by time
  unifiedItems.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return (
    <div className="min-h-screen flex flex-col font-sans bg-[#f8f8f8]">
      <Navbar />
      <main className="flex-1 relative">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-10 relative z-10">
          
          {/* Header Banner */}
          <div className="mb-8 border-l-8 border-[#ff3333] pl-6 py-4 bg-white border-y-4 border-r-4 border-black shadow-[6px_6px_0_0_#000]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-4xl sm:text-5xl font-black uppercase tracking-tighter text-black">
                  Accountability Ledger
                </h1>
                <p className="mt-1 text-sm text-black font-bold uppercase tracking-widest">
                  Capital defended under pressure, accountability tab & settlement history.
                </p>
              </div>

              {/* Status Badge */}
              <div>
                {balance < 0 ? (
                  <span className="inline-flex items-center gap-2 bg-[#ff3333] text-white px-3.5 py-1.5 border-4 border-black font-black uppercase text-xs tracking-wider shadow-[3px_3px_0_0_#000] animate-pulse">
                    <span className="w-2.5 h-2.5 bg-white border border-black rounded-full"></span>
                    Banished (In Debt)
                  </span>
                ) : balance > 0 ? (
                  <span className="inline-flex items-center gap-2 bg-[#00ff66] text-black px-3.5 py-1.5 border-4 border-black font-black uppercase text-xs tracking-wider shadow-[3px_3px_0_0_#000]">
                    <span className="w-2.5 h-2.5 bg-black rounded-full"></span>
                    Active Credit
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2 bg-[#00ff66] text-black px-3.5 py-1.5 border-4 border-black font-black uppercase text-xs tracking-wider shadow-[3px_3px_0_0_#000]">
                    <span className="w-2.5 h-2.5 bg-black rounded-full"></span>
                    Debt-Free
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick Metrics Bar (Capital Defended & Defense Rate) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            {/* Card 1: Account Standing */}
            <div className="bg-white border-4 border-black p-4 shadow-[4px_4px_0_0_#000]">
              <span className="text-xs text-black font-black uppercase tracking-wider block mb-1">
                Account Standing
              </span>
              <span className={`text-xl font-black uppercase tracking-tight ${balance < 0 ? 'text-[#ff3333]' : 'text-[#00aa44]'}`}>
                {balance < 0 ? 'Locked Out' : balance > 0 ? 'Surplus Credit' : 'Debt-Free'}
              </span>
            </div>

            {/* Card 2: Total Capital Defended */}
            <div className="bg-white border-4 border-black p-4 shadow-[4px_4px_0_0_#000] border-l-8 border-l-[#00ff66]">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-black font-black uppercase tracking-wider">
                  Capital Defended
                </span>
                <span className="bg-[#00ff66] text-black text-[10px] font-black uppercase px-1.5 py-0.5 border border-black shadow-[1px_1px_0_0_#000]">
                  {totalDefendedCount} Wins
                </span>
              </div>
              <span className="text-xl font-mono font-black text-[#00aa44]">
                {formatCurrency(totalDefended)}
              </span>
            </div>

            {/* Card 3: Defense Rate */}
            <div className="bg-white border-4 border-black p-4 shadow-[4px_4px_0_0_#000] border-l-8 border-l-[#ffcc00]">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-black font-black uppercase tracking-wider">
                  Defense Rate
                </span>
                <span className="bg-[#ffcc00] text-black text-[10px] font-black uppercase px-1.5 py-0.5 border border-black shadow-[1px_1px_0_0_#000]">
                  {totalDefendedCount} / {totalStakes} Stakes
                </span>
              </div>
              <span className="text-xl font-mono font-black text-black">
                {defenseRate}%
              </span>
            </div>
          </div>

          {/* Top Grid: Balance Card & Info Card */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            {/* Balance Card */}
            <div className={`md:col-span-1 nb-box p-6 flex flex-col relative overflow-hidden border-4 border-black shadow-[6px_6px_0_0_#000] ${
              balance < 0 ? 'bg-[#ffcc00]' : 'bg-white'
            }`}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-black text-black uppercase tracking-widest bg-white border-2 border-black px-2 py-0.5 shadow-[2px_2px_0_0_#000]">
                  {balance < 0 ? "Penalty Tab" : balance > 0 ? "Active Credit" : "Current Standing"}
                </span>
                {balance < 0 && (
                  <span className="text-[10px] font-black uppercase bg-[#ff3333] text-white px-2 py-0.5 border border-black shadow-[1px_1px_0_0_#000]">
                    Action Required
                  </span>
                )}
              </div>

              {/* Big Currency Display */}
              <div className="text-4xl sm:text-5xl font-mono font-black text-black mb-6 mt-2 tracking-tighter flex items-center bg-white p-4 border-4 border-black shadow-[inset_4px_4px_0_0_#000]">
                {balance < 0 ? (
                  <>
                    <span className="text-[#ff3333] mr-1">-$</span>
                    {Math.abs(balance / 100).toFixed(2)}
                  </>
                ) : (
                  <>
                    <span className="text-[#00ff66] mr-1">+$</span>
                    {(balance / 100).toFixed(2)}
                  </>
                )}
              </div>

              {/* Action Area */}
              {balance < 0 ? (
                <div className="mt-auto space-y-3">
                  <DepositModal debtAmountCents={Math.abs(balance)} />
                  <p className="text-center text-[11px] text-white bg-black p-2 font-black uppercase tracking-wider border-2 border-black">
                    Locked out of all challenges until tab is cleared.
                  </p>
                </div>
              ) : balance > 0 ? (
                <div className="mt-auto space-y-3">
                  <div className="bg-[#00ff66]/20 border-2 border-black p-3 text-left">
                    <p className="text-xs font-black text-black uppercase tracking-wide mb-1">
                      🛡️ Buffer Protected
                    </p>
                    <p className="text-[11px] font-bold text-black/80 leading-snug">
                      Any future penalty will automatically draw from this balance without locking you out.
                    </p>
                  </div>
                  <a
                    href="https://leetcode.com/problemset/"
                    target="_blank"
                    rel="noreferrer"
                    className="nb-btn nb-btn-primary w-full py-3 text-center text-sm font-black uppercase tracking-wider block shadow-[3px_3px_0_0_#000]"
                  >
                    Go to LeetCode ↗
                  </a>
                </div>
              ) : (
                <div className="mt-auto space-y-3">
                  <div className="bg-[#00ff66]/15 border-2 border-black p-3 text-center shadow-[2px_2px_0_0_#000]">
                    <span className="text-black text-sm font-black uppercase tracking-widest flex items-center justify-center gap-2">
                      <svg className="w-5 h-5 text-[#00aa44]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" />
                      </svg>
                      Clean Slate
                    </span>
                    <p className="text-[11px] font-bold text-black/70 mt-1">
                      No debts owed. Ready for high-stakes practice.
                    </p>
                  </div>
                  <a
                    href="https://leetcode.com/problemset/"
                    target="_blank"
                    rel="noreferrer"
                    className="nb-btn nb-btn-primary w-full py-3 text-center text-sm font-black uppercase tracking-wider block shadow-[3px_3px_0_0_#000]"
                  >
                    Go to LeetCode ↗
                  </a>
                </div>
              )}
            </div>

            {/* Rules / Explanation Card */}
            <div className="md:col-span-2 nb-box p-6 sm:p-8 flex flex-col justify-center bg-white border-4 border-black shadow-[6px_6px_0_0_#000]">
              <h2 className="text-2xl font-black text-black mb-5 uppercase tracking-tighter bg-[#00ff66] inline-block w-fit px-3 py-1 border-2 border-black shadow-[2px_2px_0_0_#000] -rotate-1">
                How Accountability & Capital Work
              </h2>

              <ul className="space-y-4 text-sm text-black font-bold">
                <li className="flex items-start gap-3">
                  <span className="bg-[#00ff66] border-2 border-black w-6 h-6 flex items-center justify-center shadow-[2px_2px_0_0_#000] mt-0.5 shrink-0 text-black">✓</span>
                  <span><span className="bg-[#ffcc00] px-1 border-2 border-black shadow-[1px_1px_0_0_#000] mr-1">Zero Upfront Escrow:</span> Place stakes instantly on LeetCode without depositing money first.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="bg-[#00ff66] border-2 border-black w-6 h-6 flex items-center justify-center shadow-[2px_2px_0_0_#000] mt-0.5 shrink-0 text-black">✓</span>
                  <span><span className="bg-[#00ff66] px-1 border-2 border-black shadow-[1px_1px_0_0_#000] mr-1">Capital Defended:</span> If you complete the challenge, you defend your capital, grow your streak, and pay $0.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="bg-[#ff3333] border-2 border-black text-white w-6 h-6 flex items-center justify-center shadow-[2px_2px_0_0_#000] mt-0.5 shrink-0">✗</span>
                  <span><span className="bg-black text-white px-1 border-2 border-black shadow-[1px_1px_0_0_#000] mr-1">Capital Lost:</span> If you fail the challenge, you incur a debt penalty.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="bg-[#ff3333] border-2 border-black text-white w-6 h-6 flex items-center justify-center shadow-[2px_2px_0_0_#000] mt-0.5 shrink-0">✗</span>
                  <span><span className="bg-black text-white px-1 border-2 border-black shadow-[1px_1px_0_0_#000] mr-1">The Lockout:</span> While in debt, you cannot start new challenges until your tab is settled.</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Interactive Unified Accountability Ledger */}
          <LedgerClient items={unifiedItems} />

        </div>
      </main>
    </div>
  );
}
