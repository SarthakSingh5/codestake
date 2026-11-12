import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import { createSupabaseAdminClient } from "@/lib/supabase/admin-client";
import { redirect } from "next/navigation";
import AdminDashboardClient, { AdminUser, AdminContract, AdminTransaction, AdminSession } from "./AdminDashboardClient";

export const metadata = {
  title: "Admin Control Center — CodeStake",
  description: "CodeStake admin dashboard and platform oversight",
};

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const supabase = await createSupabaseServerClient();

  // Verify authentication & role
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (currentProfile?.role !== "admin") redirect("/");

  // Use service role admin client for aggregating full platform metrics
  const adminClient = createSupabaseAdminClient();

  const [
    authUsersRes,
    profilesRes,
    walletsRes,
    contractsRes,
    transactionsRes,
    sessionsRes,
    problemsRes,
  ] = await Promise.all([
    adminClient.auth.admin.listUsers(),
    adminClient.from("profiles").select("id, role, created_at"),
    adminClient.from("wallets").select("user_id, balance_cents, persona_score, is_banned"),
    adminClient
      .from("challenge_contracts")
      .select("id, user_id, mode, status, penalty_cents, target_days, target_problems_per_day, total_problems_solved, started_at, expires_at")
      .order("started_at", { ascending: false })
      .limit(100),
    adminClient
      .from("transactions")
      .select("id, user_id, amount_cents, type, reference_id, created_at")
      .order("created_at", { ascending: false })
      .limit(150),
    adminClient
      .from("stake_sessions")
      .select("id, user_id, amount_cents, mode, status, created_at")
      .order("created_at", { ascending: false })
      .limit(200),
    adminClient
      .from("problems")
      .select("id, difficulty")
      .not("description", "ilike", "%External problem imported%"),
  ]);

  // Build User Map
  const authUsers = authUsersRes.data?.users || [];
  const profiles = profilesRes.data || [];
  const wallets = walletsRes.data || [];

  const emailMap: Record<string, string> = {};
  authUsers.forEach((u) => {
    emailMap[u.id] = u.email || "Unknown Email";
  });

  const profileMap: Record<string, any> = {};
  profiles.forEach((p) => {
    profileMap[p.id] = p;
  });

  const walletMap: Record<string, any> = {};
  wallets.forEach((w) => {
    walletMap[w.user_id] = w;
  });

  // Construct complete warrior objects
  const users: AdminUser[] = authUsers.map((u) => {
    const prof = profileMap[u.id];
    const w = walletMap[u.id];
    return {
      id: u.id,
      email: u.email || "No Email",
      role: prof?.role || "user",
      balanceCents: w?.balance_cents ?? 0,
      personaScore: w?.persona_score ?? 0,
      isBanned: w?.is_banned ?? false,
      createdAt: u.created_at,
    };
  });

  // Construct contracts
  const contracts: AdminContract[] = (contractsRes.data || []).map((c: any) => ({
    id: c.id,
    userId: c.user_id,
    userEmail: emailMap[c.user_id] || "Unknown User",
    mode: c.mode,
    status: c.status,
    penaltyCents: c.penalty_cents || 0,
    targetDays: c.target_days || 1,
    targetProblemsPerDay: c.target_problems_per_day || 1,
    problemsSolved: c.total_problems_solved || 0,
    startedAt: c.started_at,
    expiresAt: c.expires_at,
  }));

  // Construct transactions
  const transactions: AdminTransaction[] = (transactionsRes.data || []).map((t: any) => ({
    id: t.id,
    userId: t.user_id,
    userEmail: emailMap[t.user_id] || "Unknown User",
    amountCents: t.amount_cents || 0,
    type: t.type,
    referenceId: t.reference_id,
    createdAt: t.created_at,
  }));

  // Construct sessions
  const sessions: AdminSession[] = (sessionsRes.data || []).map((s: any) => ({
    id: s.id,
    userId: s.user_id,
    amountCents: s.amount_cents || 0,
    mode: s.mode || "one_shot",
    status: s.status || "active",
    createdAt: s.created_at,
  }));

  // Difficulty breakdown
  const problems = problemsRes.data || [];
  const difficultyStats = {
    Easy: problems.filter((p) => p.difficulty === "Easy").length,
    Medium: problems.filter((p) => p.difficulty === "Medium").length,
    Hard: problems.filter((p) => p.difficulty === "Hard").length,
  };

  return (
    <AdminDashboardClient
      currentUserEmail={user.email || "Admin"}
      users={users}
      contracts={contracts}
      transactions={transactions}
      sessions={sessions}
      problemsCount={problems.length}
      difficultyStats={difficultyStats}
    />
  );
}
