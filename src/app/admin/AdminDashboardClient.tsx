"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toggleUserBan, clearUserDebt, toggleUserRole, setUserPersonaScore } from "./actions";

export interface AdminUser {
  id: string;
  email: string;
  role: string;
  balanceCents: number;
  personaScore: number;
  isBanned: boolean;
  createdAt: string;
}

export interface AdminContract {
  id: string;
  userId: string;
  userEmail: string;
  mode: string;
  status: string;
  penaltyCents: number;
  targetDays: number;
  targetProblemsPerDay: number;
  problemsSolved: number;
  startedAt: string;
  expiresAt: string;
}

export interface AdminTransaction {
  id: string;
  userId: string;
  userEmail: string;
  amountCents: number;
  type: string;
  referenceId: string | null;
  createdAt: string;
}

export interface AdminSession {
  id: string;
  userId: string;
  amountCents: number;
  mode: string;
  status: string;
  createdAt: string;
}

interface AdminDashboardProps {
  currentUserEmail: string;
  users: AdminUser[];
  contracts: AdminContract[];
  transactions: AdminTransaction[];
  sessions: AdminSession[];
  problemsCount: number;
  difficultyStats: { Easy: number; Medium: number; Hard: number };
}

export default function AdminDashboardClient({
  currentUserEmail,
  users: initialUsers,
  contracts,
  transactions,
  sessions,
  problemsCount,
  difficultyStats,
}: AdminDashboardProps) {
  const [users, setUsers] = useState<AdminUser[]>(initialUsers);
  const [activeTab, setActiveTab] = useState<"users" | "contracts" | "ledger" | "problems">("users");
  const [searchQuery, setSearchQuery] = useState("");
  const [userFilter, setUserFilter] = useState<"all" | "banned" | "debt" | "admin">("all");
  const [contractFilter, setContractFilter] = useState<"all" | "blood_pact" | "gauntlet" | "active">("all");
  const [txFilter, setTxFilter] = useState<"all" | "deposit" | "stake_lost">("all");
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [dossierTab, setDossierTab] = useState<"battles" | "ledger" | "controls">("battles");
  const [customScoreInput, setCustomScoreInput] = useState<string>("");

  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showFeedback = (message: string, type: "success" | "error") => {
    setFeedback({ message, type });
    setTimeout(() => setFeedback(null), 4000);
  };

  // Actions
  const handleToggleBan = (user: AdminUser) => {
    const nextBanState = !user.isBanned;
    startTransition(async () => {
      try {
        await toggleUserBan(user.id, nextBanState);
        setUsers((prev) =>
          prev.map((u) => (u.id === user.id ? { ...u, isBanned: nextBanState } : u))
        );
        if (selectedUser?.id === user.id) {
          setSelectedUser((prev) => (prev ? { ...prev, isBanned: nextBanState } : null));
        }
        showFeedback(`User ${user.email} is now ${nextBanState ? "BANNED" : "UNBANNED"}.`, "success");
      } catch (err: any) {
        showFeedback(err.message || "Failed to update ban status", "error");
      }
    });
  };

  const handleClearDebt = (user: AdminUser) => {
    if (!confirm(`Are you sure you want to forgive and reset debt for ${user.email}?`)) return;
    startTransition(async () => {
      try {
        await clearUserDebt(user.id);
        setUsers((prev) =>
          prev.map((u) => (u.id === user.id ? { ...u, balanceCents: 0 } : u))
        );
        if (selectedUser?.id === user.id) {
          setSelectedUser((prev) => (prev ? { ...prev, balanceCents: 0 } : null));
        }
        showFeedback(`Debt cleared for ${user.email}. Balance is now $0.00.`, "success");
      } catch (err: any) {
        showFeedback(err.message || "Failed to clear debt", "error");
      }
    });
  };

  const handleToggleRole = (user: AdminUser) => {
    const nextRole = user.role === "admin" ? "user" : "admin";
    if (!confirm(`Switch ${user.email} role to ${nextRole.toUpperCase()}?`)) return;
    startTransition(async () => {
      try {
        await toggleUserRole(user.id, user.role);
        setUsers((prev) =>
          prev.map((u) => (u.id === user.id ? { ...u, role: nextRole } : u))
        );
        if (selectedUser?.id === user.id) {
          setSelectedUser((prev) => (prev ? { ...prev, role: nextRole } : null));
        }
        showFeedback(`${user.email} role updated to ${nextRole.toUpperCase()}.`, "success");
      } catch (err: any) {
        showFeedback(err.message || "Failed to toggle role", "error");
      }
    });
  };

  const handleSetPersonaScore = (user: AdminUser, score: number) => {
    startTransition(async () => {
      try {
        await setUserPersonaScore(user.id, score);
        setUsers((prev) =>
          prev.map((u) => (u.id === user.id ? { ...u, personaScore: score } : u))
        );
        if (selectedUser?.id === user.id) {
          setSelectedUser((prev) => (prev ? { ...prev, personaScore: score } : null));
        }
        showFeedback(`Persona score for ${user.email} updated to ${score}.`, "success");
        setCustomScoreInput("");
      } catch (err: any) {
        showFeedback(err.message || "Failed to update score", "error");
      }
    });
  };

  // Filtered Users
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.id.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    if (userFilter === "banned") return u.isBanned;
    if (userFilter === "debt") return u.balanceCents < 0;
    if (userFilter === "admin") return u.role === "admin";
    return true;
  });

  // Filtered Contracts
  const filteredContracts = contracts.filter((c) => {
    if (contractFilter === "blood_pact") return c.mode === "blood_pact";
    if (contractFilter === "gauntlet") return c.mode === "gauntlet";
    if (contractFilter === "active") return c.status === "active";
    return true;
  });

  // Filtered Transactions
  const filteredTxs = transactions.filter((t) => {
    if (txFilter === "deposit") return t.type === "deposit";
    if (txFilter === "stake_lost") return t.type === "stake_lost";
    return true;
  });

  // KPI Calculations
  const totalUsers = users.length;
  const bannedCount = users.filter((u) => u.isBanned).length;
  const inDebtCount = users.filter((u) => u.balanceCents < 0).length;
  const activeContractsCount = contracts.filter((c) => c.status === "active").length;
  const totalSettledCents = transactions
    .filter((t) => t.type === "deposit")
    .reduce((sum, t) => sum + t.amountCents, 0);
  const totalPenaltiesCents = transactions
    .filter((t) => t.type === "stake_lost")
    .reduce((sum, t) => sum + t.amountCents, 0);

  // User-specific Dossier data
  const userContracts = selectedUser ? contracts.filter((c) => c.userId === selectedUser.id) : [];
  const userTransactions = selectedUser ? transactions.filter((t) => t.userId === selectedUser.id) : [];
  const userSessions = selectedUser ? sessions.filter((s) => s.userId === selectedUser.id) : [];

  const userWonSessions = userSessions.filter((s) => s.status === "won").length;
  const userLostSessions = userSessions.filter((s) => s.status === "lost").length;
  const userTotalCompleted = userWonSessions + userLostSessions;
  const userWinRate = userTotalCompleted > 0 ? Math.round((userWonSessions / userTotalCompleted) * 100) : 0;

  const userDepositedCents = userTransactions
    .filter((t) => t.type === "deposit")
    .reduce((sum, t) => sum + t.amountCents, 0);
  const userPenaltiesCents = userTransactions
    .filter((t) => t.type === "stake_lost")
    .reduce((sum, t) => sum + t.amountCents, 0);

  return (
    <div className="min-h-screen bg-[#f4f4f0] text-black font-sans pb-16">
      {/* Top Banner */}
      <div className="bg-[#ffcc00] border-b-4 border-black px-4 py-2 flex items-center justify-between text-xs font-black uppercase tracking-widest">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#00ff66] border border-black animate-pulse" />
          <span>CodeStake Master Control // Live Platform Operations</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="hidden sm:inline bg-white px-2 py-0.5 border border-black">
            ADMIN: {currentUserEmail}
          </span>
          <Link href="/problems" className="hover:underline flex items-center gap-1 font-black">
            Arena ↗
          </Link>
          <Link href="/wallet" className="hover:underline flex items-center gap-1 font-black">
            Ledger ↗
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <div className="inline-block bg-[#00ff66] border-2 border-black px-3 py-0.5 text-xs font-black uppercase tracking-widest shadow-[2px_2px_0_0_#000] mb-2">
              Superuser Command Deck
            </div>
            <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tight text-black">
              System Administration
            </h1>
            <p className="text-sm text-gray-700 font-bold mt-1">
              Live oversight over warrior accounts, active penalty contracts, and financial flows.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/admin/problems"
              className="nb-btn nb-btn-primary py-2.5 px-4 text-xs font-black uppercase tracking-wider flex items-center gap-1.5"
            >
              <span>🧩 Manage Problems</span>
            </Link>
            <Link
              href="/admin/problems/create"
              className="nb-btn py-2.5 px-4 text-xs font-black uppercase tracking-wider bg-white flex items-center gap-1.5"
            >
              <span>+ Add Problem</span>
            </Link>
          </div>
        </div>

        {/* Global Alert Notification */}
        {feedback && (
          <div
            className={`p-3.5 mb-6 border-4 border-black font-black uppercase text-xs tracking-wider flex justify-between items-center shadow-[4px_4px_0_0_#000] animate-in fade-in duration-200 ${
              feedback.type === "success" ? "bg-[#00ff66] text-black" : "bg-[#ff3333] text-white"
            }`}
          >
            <span>{feedback.message}</span>
            <button onClick={() => setFeedback(null)} className="underline text-xs">
              Dismiss
            </button>
          </div>
        )}

        {/* High-Level Metric Tiles */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <div className="nb-box p-4 bg-white border-4 border-black shadow-[6px_6px_0_0_#000]">
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-600 block mb-1">
              Registered Warriors
            </span>
            <div className="flex items-baseline justify-between">
              <span className="font-mono text-3xl font-black text-black">{totalUsers}</span>
              <span className="text-[11px] font-bold text-gray-500">
                {bannedCount > 0 ? `${bannedCount} Banned` : "0 Banned"}
              </span>
            </div>
          </div>

          <div className="nb-box p-4 bg-white border-4 border-black shadow-[6px_6px_0_0_#000]">
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-600 block mb-1">
              Active Battlefronts
            </span>
            <div className="flex items-baseline justify-between">
              <span className="font-mono text-3xl font-black text-[#00a843]">{activeContractsCount}</span>
              <span className="text-[11px] font-bold text-gray-500">Live Pacts</span>
            </div>
          </div>

          <div className="nb-box p-4 bg-white border-4 border-black shadow-[6px_6px_0_0_#000]">
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-600 block mb-1">
              Sanctions Imposed
            </span>
            <div className="flex items-baseline justify-between">
              <span className="font-mono text-3xl font-black text-[#ff3333]">
                ${(Math.abs(totalPenaltiesCents) / 100).toFixed(0)}
              </span>
              <span className="text-[11px] font-bold text-gray-500">{inDebtCount} in Debt</span>
            </div>
          </div>

          <div className="nb-box p-4 bg-white border-4 border-black shadow-[6px_6px_0_0_#000]">
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-600 block mb-1">
              Settlements Collected
            </span>
            <div className="flex items-baseline justify-between">
              <span className="font-mono text-3xl font-black text-black">
                ${(totalSettledCents / 100).toFixed(0)}
              </span>
              <span className="text-[11px] font-bold text-gray-500">Stripe / Web</span>
            </div>
          </div>

          <div className="nb-box p-4 bg-white border-4 border-black shadow-[6px_6px_0_0_#000] col-span-2 lg:col-span-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-600 block mb-1">
              Arena Armory
            </span>
            <div className="flex items-baseline justify-between">
              <span className="font-mono text-3xl font-black text-black">{problemsCount}</span>
              <span className="text-[11px] font-bold text-gray-500">
                {difficultyStats.Easy}E / {difficultyStats.Medium}M / {difficultyStats.Hard}H
              </span>
            </div>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex flex-wrap gap-2 mb-6 border-b-4 border-black pb-4">
          <button
            onClick={() => setActiveTab("users")}
            className={`px-4 py-2.5 text-xs font-black uppercase tracking-wider border-2 border-black transition-all shadow-[2px_2px_0_0_#000] ${
              activeTab === "users"
                ? "bg-[#ffcc00] text-black -translate-y-0.5 shadow-[4px_4px_0_0_#000]"
                : "bg-white text-black hover:bg-gray-100"
            }`}
          >
            👥 Warriors & Bans ({users.length})
          </button>

          <button
            onClick={() => setActiveTab("contracts")}
            className={`px-4 py-2.5 text-xs font-black uppercase tracking-wider border-2 border-black transition-all shadow-[2px_2px_0_0_#000] ${
              activeTab === "contracts"
                ? "bg-[#ffcc00] text-black -translate-y-0.5 shadow-[4px_4px_0_0_#000]"
                : "bg-white text-black hover:bg-gray-100"
            }`}
          >
            ⚔️ Active Pacts & Challenges ({contracts.length})
          </button>

          <button
            onClick={() => setActiveTab("ledger")}
            className={`px-4 py-2.5 text-xs font-black uppercase tracking-wider border-2 border-black transition-all shadow-[2px_2px_0_0_#000] ${
              activeTab === "ledger"
                ? "bg-[#ffcc00] text-black -translate-y-0.5 shadow-[4px_4px_0_0_#000]"
                : "bg-white text-black hover:bg-gray-100"
            }`}
          >
            💸 Ledger Audit Trail ({transactions.length})
          </button>

          <button
            onClick={() => setActiveTab("problems")}
            className={`px-4 py-2.5 text-xs font-black uppercase tracking-wider border-2 border-black transition-all shadow-[2px_2px_0_0_#000] ${
              activeTab === "problems"
                ? "bg-[#ffcc00] text-black -translate-y-0.5 shadow-[4px_4px_0_0_#000]"
                : "bg-white text-black hover:bg-gray-100"
            }`}
          >
            🧩 Problem Library ({problemsCount})
          </button>
        </div>

        {/* ── TAB 1: USERS & ACCESS CONTROL ── */}
        {activeTab === "users" && (
          <div className="nb-box p-6 bg-white border-4 border-black shadow-[8px_8px_0_0_#000]">
            {/* Filter & Search Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-6">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="🔍 Search warrior by email or ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white border-2 border-black px-3.5 py-2.5 text-xs font-bold uppercase tracking-wider outline-none shadow-[2px_2px_0_0_#000] focus:bg-[#ffcc00]/10"
                />
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                {(["all", "debt", "banned", "admin"] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setUserFilter(filter)}
                    className={`px-3 py-1.5 text-[11px] font-black uppercase tracking-wider border-2 border-black shadow-[1px_1px_0_0_#000] ${
                      userFilter === filter ? "bg-black text-white" : "bg-white text-black hover:bg-gray-100"
                    }`}
                  >
                    {filter === "all" ? "All Users" : filter === "debt" ? "In Debt" : filter}
                  </button>
                ))}
              </div>
            </div>

            {/* Users Table */}
            <div className="overflow-x-auto border-2 border-black shadow-[4px_4px_0_0_#000]">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-black text-white uppercase tracking-wider font-black border-b-2 border-black">
                    <th className="p-3">User Email / ID</th>
                    <th className="p-3">Role</th>
                    <th className="p-3 text-right">Balance / Debt</th>
                    <th className="p-3 text-center">Persona Score</th>
                    <th className="p-3 text-center">Status</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-black font-bold">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-gray-500 font-bold uppercase">
                        No users match this filter.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => {
                      const isCurrentUser = u.email === currentUserEmail;
                      const hasDebt = u.balanceCents < 0;

                      return (
                        <tr
                          key={u.id}
                          className="hover:bg-yellow-50/50 transition-colors cursor-pointer group"
                          onClick={() => setSelectedUser(u)}
                        >
                          <td className="p-3">
                            <div className="font-mono font-black text-black text-xs group-hover:text-[#00a843] flex items-center gap-1.5">
                              <span>{u.email}</span>
                              <span className="text-[10px] text-gray-400 group-hover:text-black">↗</span>
                            </div>
                            <div className="font-mono text-[10px] text-gray-500 truncate max-w-[200px]">{u.id}</div>
                          </td>

                          <td className="p-3">
                            <span
                              className={`inline-block px-2 py-0.5 text-[10px] font-black uppercase border border-black shadow-[1px_1px_0_0_#000] ${
                                u.role === "admin" ? "bg-[#ffcc00] text-black" : "bg-gray-100 text-black"
                              }`}
                            >
                              {u.role}
                            </span>
                          </td>

                          <td className="p-3 text-right font-mono font-black text-sm">
                            {hasDebt ? (
                              <span className="text-[#ff3333]">
                                -${(Math.abs(u.balanceCents) / 100).toFixed(2)}
                              </span>
                            ) : (
                              <span className="text-black">
                                ${(u.balanceCents / 100).toFixed(2)}
                              </span>
                            )}
                          </td>

                          <td className="p-3 text-center">
                            <span
                              className={`font-mono font-black text-xs px-2 py-0.5 border border-black ${
                                u.personaScore >= 0 ? "bg-[#00ff66]/20 text-black" : "bg-[#ff3333]/20 text-[#ff3333]"
                              }`}
                            >
                              {u.personaScore > 0 ? `+${u.personaScore}` : u.personaScore}
                            </span>
                          </td>

                          <td className="p-3 text-center">
                            {u.isBanned ? (
                              <span className="bg-[#ff3333] text-white px-2 py-0.5 text-[10px] font-black uppercase border border-black shadow-[1px_1px_0_0_#000]">
                                🚫 BANNED
                              </span>
                            ) : (
                              <span className="bg-[#00ff66] text-black px-2 py-0.5 text-[10px] font-black uppercase border border-black shadow-[1px_1px_0_0_#000]">
                                ACTIVE
                              </span>
                            )}
                          </td>

                          <td className="p-3 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1.5 flex-wrap">
                              <button
                                onClick={() => setSelectedUser(u)}
                                className="px-2.5 py-1 text-[10px] font-black uppercase bg-[#00ff66] text-black border border-black hover:bg-[#00dd55] transition-all shadow-[1px_1px_0_0_#000]"
                              >
                                Inspect 🔍
                              </button>

                              <button
                                onClick={() => handleToggleBan(u)}
                                disabled={isPending || isCurrentUser}
                                className={`px-2 py-1 text-[10px] font-black uppercase border border-black transition-all shadow-[1px_1px_0_0_#000] disabled:opacity-40 ${
                                  u.isBanned
                                    ? "bg-white text-black hover:bg-gray-100"
                                    : "bg-[#ff3333] text-white hover:bg-red-600"
                                }`}
                              >
                                {u.isBanned ? "Unban" : "Ban"}
                              </button>

                              {hasDebt && (
                                <button
                                  onClick={() => handleClearDebt(u)}
                                  disabled={isPending}
                                  className="px-2 py-1 text-[10px] font-black uppercase bg-[#ffcc00] text-black border border-black hover:bg-yellow-400 transition-all shadow-[1px_1px_0_0_#000] disabled:opacity-40"
                                >
                                  Clear Debt
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── TAB 2: CHALLENGES & CONTRACTS ── */}
        {activeTab === "contracts" && (
          <div className="nb-box p-6 bg-white border-4 border-black shadow-[8px_8px_0_0_#000]">
            <div className="flex items-center justify-between gap-3 mb-6">
              <h2 className="text-xl font-black uppercase tracking-tight text-black">
                Active & Historic Contracts
              </h2>
              <div className="flex items-center gap-1.5">
                {(["all", "blood_pact", "gauntlet", "active"] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setContractFilter(filter)}
                    className={`px-3 py-1.5 text-[11px] font-black uppercase tracking-wider border-2 border-black shadow-[1px_1px_0_0_#000] ${
                      contractFilter === filter ? "bg-black text-white" : "bg-white text-black hover:bg-gray-100"
                    }`}
                  >
                    {filter === "all" ? "All" : filter.replace("_", " ")}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto border-2 border-black shadow-[4px_4px_0_0_#000]">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-black text-white uppercase tracking-wider font-black border-b-2 border-black">
                    <th className="p-3">Mode</th>
                    <th className="p-3">User</th>
                    <th className="p-3 text-right">Penalty</th>
                    <th className="p-3 text-center">Quota Progress</th>
                    <th className="p-3 text-center">Status</th>
                    <th className="p-3 text-right">Started / Expires</th>
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-black font-bold">
                  {filteredContracts.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-gray-500 font-bold uppercase">
                        No contracts found.
                      </td>
                    </tr>
                  ) : (
                    filteredContracts.map((c) => (
                      <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                        <td className="p-3">
                          <span
                            className={`inline-block px-2 py-0.5 text-[10px] font-black uppercase border border-black shadow-[1px_1px_0_0_#000] ${
                              c.mode === "blood_pact"
                                ? "bg-[#ff3333] text-white"
                                : "bg-[#ffcc00] text-black"
                            }`}
                          >
                            {c.mode === "blood_pact" ? "🩸 Blood Pact" : "🔥 Gauntlet"}
                          </span>
                        </td>

                        <td className="p-3">
                          <span className="font-mono font-black text-black text-xs">{c.userEmail}</span>
                        </td>

                        <td className="p-3 text-right font-mono font-black text-sm text-[#ff3333]">
                          ${(c.penaltyCents / 100).toFixed(2)}
                        </td>

                        <td className="p-3 text-center font-mono font-bold">
                          {c.problemsSolved} / {c.targetProblemsPerDay} problems
                        </td>

                        <td className="p-3 text-center">
                          <span
                            className={`inline-block px-2 py-0.5 text-[10px] font-black uppercase border border-black ${
                              c.status === "active"
                                ? "bg-[#00ff66] text-black shadow-[1px_1px_0_0_#000]"
                                : c.status === "failed"
                                ? "bg-[#ff3333] text-white"
                                : "bg-gray-200 text-black"
                            }`}
                          >
                            {c.status}
                          </span>
                        </td>

                        <td className="p-3 text-right text-[11px] text-gray-600 font-mono">
                          {new Date(c.startedAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── TAB 3: FINANCIAL LEDGER AUDIT TRAIL ── */}
        {activeTab === "ledger" && (
          <div className="nb-box p-6 bg-white border-4 border-black shadow-[8px_8px_0_0_#000]">
            <div className="flex items-center justify-between gap-3 mb-6">
              <h2 className="text-xl font-black uppercase tracking-tight text-black">
                Real-Time Financial Ledger
              </h2>
              <div className="flex items-center gap-1.5">
                {(["all", "deposit", "stake_lost"] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setTxFilter(filter)}
                    className={`px-3 py-1.5 text-[11px] font-black uppercase tracking-wider border-2 border-black shadow-[1px_1px_0_0_#000] ${
                      txFilter === filter ? "bg-black text-white" : "bg-white text-black hover:bg-gray-100"
                    }`}
                  >
                    {filter === "all" ? "All Logs" : filter === "deposit" ? "Deposits (Cleared)" : "Penalties Incurred"}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto border-2 border-black shadow-[4px_4px_0_0_#000]">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-black text-white uppercase tracking-wider font-black border-b-2 border-black">
                    <th className="p-3">Type</th>
                    <th className="p-3">User</th>
                    <th className="p-3 text-right">Amount</th>
                    <th className="p-3">Reference / Session ID</th>
                    <th className="p-3 text-right">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-black font-bold">
                  {filteredTxs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-gray-500 font-bold uppercase">
                        No transactions recorded.
                      </td>
                    </tr>
                  ) : (
                    filteredTxs.map((t) => {
                      const isDeposit = t.type === "deposit";
                      return (
                        <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                          <td className="p-3">
                            <span
                              className={`inline-block px-2 py-0.5 text-[10px] font-black uppercase border border-black shadow-[1px_1px_0_0_#000] ${
                                isDeposit ? "bg-[#00ff66] text-black" : "bg-[#ff3333] text-white"
                              }`}
                            >
                              {isDeposit ? "💰 Deposit Cleared" : "⚡ Penalty Incurred"}
                            </span>
                          </td>

                          <td className="p-3 font-mono font-black text-xs text-black">
                            {t.userEmail}
                          </td>

                          <td className="p-3 text-right font-mono font-black text-sm">
                            <span className={isDeposit ? "text-[#00a843]" : "text-[#ff3333]"}>
                              {isDeposit ? "+" : "-"}${((t.amountCents || 0) / 100).toFixed(2)}
                            </span>
                          </td>

                          <td className="p-3 font-mono text-[11px] text-gray-600 truncate max-w-[220px]">
                            {t.referenceId || "Internal Settlement"}
                          </td>

                          <td className="p-3 text-right font-mono text-[11px] text-gray-600">
                            {new Date(t.createdAt).toLocaleString()}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── TAB 4: PROBLEMS LIBRARY OVERVIEW ── */}
        {activeTab === "problems" && (
          <div className="nb-box p-6 bg-white border-4 border-black shadow-[8px_8px_0_0_#000]">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-xl font-black uppercase tracking-tight text-black">
                  Arena Problems Catalog
                </h2>
                <p className="text-xs text-gray-600 font-bold mt-0.5">
                  Curated LeetCode algorithmic challenges enabled for strict staking.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <Link
                  href="/admin/problems"
                  className="nb-btn nb-btn-primary px-4 py-2 text-xs uppercase tracking-wider font-black"
                >
                  View Full Problem Table ↗
                </Link>
                <Link
                  href="/admin/problems/create"
                  className="nb-btn px-4 py-2 text-xs uppercase tracking-wider font-black bg-white"
                >
                  + Add Problem
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div className="p-4 border-3 border-black bg-[#00ff66]/10 shadow-[3px_3px_0_0_#000]">
                <span className="text-xs font-black uppercase text-[#00a843] block mb-1">Easy Challenges</span>
                <span className="font-mono text-3xl font-black text-black">{difficultyStats.Easy}</span>
                <span className="text-[11px] text-gray-600 font-bold block mt-1">Foundational challenges</span>
              </div>

              <div className="p-4 border-3 border-black bg-[#ffcc00]/10 shadow-[3px_3px_0_0_#000]">
                <span className="text-xs font-black uppercase text-amber-700 block mb-1">Medium Challenges</span>
                <span className="font-mono text-3xl font-black text-black">{difficultyStats.Medium}</span>
                <span className="text-[11px] text-gray-600 font-bold block mt-1">Core interview questions</span>
              </div>

              <div className="p-4 border-3 border-black bg-[#ff3333]/10 shadow-[3px_3px_0_0_#000]">
                <span className="text-xs font-black uppercase text-[#ff3333] block mb-1">Hard Challenges</span>
                <span className="font-mono text-3xl font-black text-black">{difficultyStats.Hard}</span>
                <span className="text-[11px] text-gray-600 font-bold block mt-1">Top-tier faang benchmarks</span>
              </div>
            </div>

            <div className="p-4 border-2 border-black bg-gray-50 flex justify-between items-center shadow-[2px_2px_0_0_#000]">
              <span className="text-xs font-black uppercase text-black">
                Want to configure test cases or modify problem descriptions?
              </span>
              <Link
                href="/admin/problems"
                className="text-xs font-black uppercase underline hover:text-[#00a843]"
              >
                Open Problem Editor →
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* ── WARRIOR DOSSIER (DEEP USER INSPECTOR MODAL) ── */}
      {selectedUser && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="nb-box p-6 sm:p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto bg-white border-8 border-black shadow-[16px_16px_0_0_#000] relative">
            <div className="absolute top-0 left-0 w-full h-3 bg-[#ffcc00] border-b-4 border-black" />

            {/* Close Button */}
            <button
              onClick={() => setSelectedUser(null)}
              className="absolute top-5 right-5 text-black hover:bg-[#ff3333] hover:text-white border-2 border-black p-1 shadow-[2px_2px_0_0_#000] transition-colors"
              title="Close Dossier"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Dossier Header */}
            <div className="mb-6 pt-2">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className="inline-block bg-[#ffcc00] border-2 border-black px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest shadow-[2px_2px_0_0_#000]">
                  Warrior Dossier
                </span>
                <span className="bg-black text-white px-2 py-0.5 text-[10px] font-black uppercase">
                  {selectedUser.role.toUpperCase()}
                </span>
                {selectedUser.isBanned ? (
                  <span className="bg-[#ff3333] text-white px-2 py-0.5 text-[10px] font-black uppercase border border-black shadow-[1px_1px_0_0_#000]">
                    🚫 BANNED
                  </span>
                ) : (
                  <span className="bg-[#00ff66] text-black px-2 py-0.5 text-[10px] font-black uppercase border border-black shadow-[1px_1px_0_0_#000]">
                    ACTIVE STANDING
                  </span>
                )}
              </div>

              <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-black break-all">
                {selectedUser.email}
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="font-mono text-xs text-gray-500">ID: {selectedUser.id}</span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(selectedUser.id);
                    showFeedback("User UUID copied to clipboard!", "success");
                  }}
                  className="text-[10px] font-black uppercase underline hover:text-[#00a843]"
                >
                  Copy
                </button>
                <span className="text-gray-300">•</span>
                <span className="text-xs text-gray-500 font-bold">
                  Enrolled: {new Date(selectedUser.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>

            {/* 4 Core Dossier Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              <div className="p-3.5 border-3 border-black bg-white shadow-[4px_4px_0_0_#000]">
                <span className="text-[10px] font-black uppercase text-gray-500 block mb-1">
                  Balance / Debt
                </span>
                <span className={`font-mono font-black text-xl ${selectedUser.balanceCents < 0 ? "text-[#ff3333]" : "text-black"}`}>
                  {selectedUser.balanceCents < 0 ? `-$${(Math.abs(selectedUser.balanceCents) / 100).toFixed(2)}` : `$${(selectedUser.balanceCents / 100).toFixed(2)}`}
                </span>
                {selectedUser.balanceCents < 0 && (
                  <span className="text-[9px] font-black text-[#ff3333] uppercase block mt-1">
                    Penalty Due
                  </span>
                )}
              </div>

              <div className="p-3.5 border-3 border-black bg-white shadow-[4px_4px_0_0_#000]">
                <span className="text-[10px] font-black uppercase text-gray-500 block mb-1">
                  Persona Score
                </span>
                <span className={`font-mono font-black text-xl ${selectedUser.personaScore >= 0 ? "text-[#00a843]" : "text-[#ff3333]"}`}>
                  {selectedUser.personaScore > 0 ? `+${selectedUser.personaScore}` : selectedUser.personaScore}
                </span>
                <span className="text-[9px] font-bold text-gray-500 uppercase block mt-1">
                  {selectedUser.personaScore >= 50 ? "🛡️ Paragon" : selectedUser.personaScore < 0 ? "⚡ Disgraced" : "⚔️ Competitor"}
                </span>
              </div>

              <div className="p-3.5 border-3 border-black bg-white shadow-[4px_4px_0_0_#000]">
                <span className="text-[10px] font-black uppercase text-gray-500 block mb-1">
                  Battle Win Rate
                </span>
                <span className="font-mono font-black text-xl text-black">
                  {userWinRate}%
                </span>
                <span className="text-[9px] font-bold text-gray-500 uppercase block mt-1">
                  {userWonSessions}W - {userLostSessions}L ({userTotalCompleted} total)
                </span>
              </div>

              <div className="p-3.5 border-3 border-black bg-white shadow-[4px_4px_0_0_#000]">
                <span className="text-[10px] font-black uppercase text-gray-500 block mb-1">
                  Settlements Deposited
                </span>
                <span className="font-mono font-black text-xl text-[#00a843]">
                  ${(userDepositedCents / 100).toFixed(2)}
                </span>
                <span className="text-[9px] font-bold text-gray-500 uppercase block mt-1">
                  {userTransactions.length} Total Tx
                </span>
              </div>
            </div>

            {/* Dossier Tabs */}
            <div className="flex gap-2 border-b-2 border-black pb-2 mb-4">
              <button
                onClick={() => setDossierTab("battles")}
                className={`px-3 py-1.5 text-xs font-black uppercase tracking-wider border-2 border-black ${
                  dossierTab === "battles" ? "bg-black text-white" : "bg-white text-black hover:bg-gray-100"
                }`}
              >
                ⚔️ Challenges ({userContracts.length + userSessions.length})
              </button>
              <button
                onClick={() => setDossierTab("ledger")}
                className={`px-3 py-1.5 text-xs font-black uppercase tracking-wider border-2 border-black ${
                  dossierTab === "ledger" ? "bg-black text-white" : "bg-white text-black hover:bg-gray-100"
                }`}
              >
                💸 Financial Audit ({userTransactions.length})
              </button>
              <button
                onClick={() => setDossierTab("controls")}
                className={`px-3 py-1.5 text-xs font-black uppercase tracking-wider border-2 border-black ${
                  dossierTab === "controls" ? "bg-[#ffcc00] text-black" : "bg-white text-black hover:bg-gray-100"
                }`}
              >
                ⚡ Admin Overrides
              </button>
            </div>

            {/* Dossier Tab Content: Battles */}
            {dossierTab === "battles" && (
              <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
                {/* Contracts */}
                {userContracts.length > 0 && (
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-black mb-2">
                      Multi-Day Challenge Contracts ({userContracts.length})
                    </h4>
                    <div className="space-y-2">
                      {userContracts.map((c) => (
                        <div key={c.id} className="p-3 border-2 border-black bg-gray-50 flex items-center justify-between text-xs">
                          <div>
                            <span className="font-black uppercase text-black mr-2">
                              {c.mode === "blood_pact" ? "🩸 Blood Pact" : "🔥 Gauntlet"}
                            </span>
                            <span className="font-mono text-gray-600">
                              Quota: {c.problemsSolved}/{c.targetProblemsPerDay} problems
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-black text-[#ff3333]">
                              ${(c.penaltyCents / 100).toFixed(2)}
                            </span>
                            <span
                              className={`px-2 py-0.5 text-[10px] font-black uppercase border border-black ${
                                c.status === "active" ? "bg-[#00ff66] text-black" : c.status === "completed" ? "bg-black text-white" : "bg-[#ff3333] text-white"
                              }`}
                            >
                              {c.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Quick Play Sessions */}
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-black mb-2">
                    Quick Play Sessions ({userSessions.length})
                  </h4>
                  {userSessions.length === 0 ? (
                    <p className="text-xs text-gray-500 font-bold uppercase p-4 text-center border-2 border-dashed border-black">
                      No quick play sessions found for this warrior.
                    </p>
                  ) : (
                    <div className="space-y-1.5">
                      {userSessions.slice(0, 20).map((s) => (
                        <div key={s.id} className="p-2.5 border-2 border-black bg-white flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-black uppercase text-[11px]">{s.mode.replace("_", " ")}</span>
                            <span className="font-mono text-[10px] text-gray-500">{new Date(s.createdAt).toLocaleDateString()}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-black text-xs">${((s.amountCents || 0) / 100).toFixed(2)}</span>
                            <span
                              className={`px-1.5 py-0.5 text-[9px] font-black uppercase border border-black ${
                                s.status === "won" ? "bg-[#00ff66] text-black" : s.status === "lost" ? "bg-[#ff3333] text-white" : "bg-[#ffcc00] text-black"
                              }`}
                            >
                              {s.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Dossier Tab Content: Ledger */}
            {dossierTab === "ledger" && (
              <div className="max-h-[300px] overflow-y-auto pr-1">
                {userTransactions.length === 0 ? (
                  <p className="text-xs text-gray-500 font-bold uppercase p-6 text-center border-2 border-dashed border-black">
                    No transactions recorded for this warrior.
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {userTransactions.map((t) => {
                      const isDeposit = t.type === "deposit";
                      return (
                        <div key={t.id} className="p-2.5 border-2 border-black bg-white flex items-center justify-between text-xs">
                          <div>
                            <span
                              className={`inline-block px-1.5 py-0.5 text-[9px] font-black uppercase border border-black mr-2 ${
                                isDeposit ? "bg-[#00ff66] text-black" : "bg-[#ff3333] text-white"
                              }`}
                            >
                              {isDeposit ? "Deposit" : "Penalty"}
                            </span>
                            <span className="font-mono text-[10px] text-gray-600 truncate max-w-[200px] inline-block align-middle">
                              {t.referenceId || "Internal Settlement"}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className={`font-mono font-black text-xs ${isDeposit ? "text-[#00a843]" : "text-[#ff3333]"}`}>
                              {isDeposit ? "+" : "-"}${((t.amountCents || 0) / 100).toFixed(2)}
                            </span>
                            <span className="font-mono text-[10px] text-gray-500">
                              {new Date(t.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Dossier Tab Content: Admin Overrides */}
            {dossierTab === "controls" && (
              <div className="space-y-4 pt-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Ban Toggle */}
                  <div className="p-4 border-3 border-black bg-gray-50">
                    <span className="text-xs font-black uppercase text-black block mb-1">
                      Account Access Status
                    </span>
                    <p className="text-[11px] text-gray-600 font-bold mb-3">
                      {selectedUser.isBanned
                        ? "Currently banned from the Arena and extension."
                        : "Account in active standing. Can forge pacts and solve."}
                    </p>
                    <button
                      onClick={() => handleToggleBan(selectedUser)}
                      disabled={isPending || selectedUser.email === currentUserEmail}
                      className={`w-full py-2.5 text-xs font-black uppercase border-2 border-black shadow-[2px_2px_0_0_#000] disabled:opacity-40 ${
                        selectedUser.isBanned ? "bg-[#00ff66] text-black hover:bg-[#00dd55]" : "bg-[#ff3333] text-white hover:bg-red-600"
                      }`}
                    >
                      {selectedUser.isBanned ? "Lift Ban (Restore Access)" : "Impose Ban (Lockout)"}
                    </button>
                  </div>

                  {/* Clear Debt */}
                  <div className="p-4 border-3 border-black bg-gray-50">
                    <span className="text-xs font-black uppercase text-black block mb-1">
                      Debt Forgiveness
                    </span>
                    <p className="text-[11px] text-gray-600 font-bold mb-3">
                      Current balance is {selectedUser.balanceCents < 0 ? `-$${(Math.abs(selectedUser.balanceCents) / 100).toFixed(2)}` : `$${(selectedUser.balanceCents / 100).toFixed(2)}`}.
                    </p>
                    <button
                      onClick={() => handleClearDebt(selectedUser)}
                      disabled={isPending || selectedUser.balanceCents >= 0}
                      className="w-full py-2.5 text-xs font-black uppercase bg-[#ffcc00] text-black border-2 border-black hover:bg-yellow-400 shadow-[2px_2px_0_0_#000] disabled:opacity-40"
                    >
                      {selectedUser.balanceCents < 0 ? "Forgive & Reset to $0.00" : "No Debt to Forgive"}
                    </button>
                  </div>

                  {/* Persona Score Setter */}
                  <div className="p-4 border-3 border-black bg-gray-50 sm:col-span-2">
                    <span className="text-xs font-black uppercase text-black block mb-1">
                      Adjust Persona Score (Standing)
                    </span>
                    <p className="text-[11px] text-gray-600 font-bold mb-3">
                      Current score: <span className="font-mono font-black">{selectedUser.personaScore}</span>. Affects dialogues, trust tiers, and honor standings.
                    </p>

                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={() => handleSetPersonaScore(selectedUser, (selectedUser.personaScore || 0) + 50)}
                        disabled={isPending}
                        className="px-3 py-1.5 text-xs font-black uppercase bg-[#00ff66] text-black border-2 border-black shadow-[1px_1px_0_0_#000]"
                      >
                        +50 Bonus
                      </button>
                      <button
                        onClick={() => handleSetPersonaScore(selectedUser, 0)}
                        disabled={isPending}
                        className="px-3 py-1.5 text-xs font-black uppercase bg-white text-black border-2 border-black shadow-[1px_1px_0_0_#000]"
                      >
                        Reset to 0
                      </button>
                      <button
                        onClick={() => handleSetPersonaScore(selectedUser, (selectedUser.personaScore || 0) - 50)}
                        disabled={isPending}
                        className="px-3 py-1.5 text-xs font-black uppercase bg-[#ff3333] text-white border-2 border-black shadow-[1px_1px_0_0_#000]"
                      >
                        -50 Penalty
                      </button>

                      <div className="flex items-center gap-1.5 ml-auto">
                        <input
                          type="number"
                          placeholder="Custom score..."
                          value={customScoreInput}
                          onChange={(e) => setCustomScoreInput(e.target.value)}
                          className="w-28 px-2 py-1 text-xs font-mono font-black border-2 border-black bg-white"
                        />
                        <button
                          onClick={() => {
                            const val = parseInt(customScoreInput, 10);
                            if (!isNaN(val)) handleSetPersonaScore(selectedUser, val);
                          }}
                          disabled={isPending || customScoreInput === ""}
                          className="px-3 py-1 text-xs font-black uppercase bg-black text-white border-2 border-black disabled:opacity-40"
                        >
                          Set
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
