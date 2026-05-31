"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import { createSupabaseAdminClient } from "@/lib/supabase/admin-client";
import { revalidatePath } from "next/cache";

export async function createStakeSession(problemId: string, amountCents: number, mode: string, durationMinutes: number) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  // 1. Verify user has enough balance
  const { data: wallet } = await supabase
    .from("wallets")
    .select("balance_cents")
    .eq("user_id", user.id)
    .single();

  if (!wallet || wallet.balance_cents < amountCents) {
    throw new Error("Insufficient funds");
  }

  // 2. Check if an active session already exists for this problem
  const { data: existing } = await supabase
    .from("stake_sessions")
    .select("id")
    .eq("user_id", user.id)
    .eq("problem_id", problemId)
    .eq("status", "active")
    .single();

  if (existing) {
    throw new Error("Active session already exists");
  }

  // 3. Create the session with the user's chosen duration
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + durationMinutes);

  // We use the admin client here to bypass RLS for inserting.
  const adminClient = createSupabaseAdminClient();
  const { data: newSession, error } = await adminClient
    .from("stake_sessions")
    .insert({
      user_id: user.id,
      problem_id: problemId,
      amount_cents: amountCents,
      mode: mode,
      status: "active",
      expires_at: expiresAt.toISOString()
    })
    .select()
    .single();

  if (error) {
    console.error("Failed to create stake session:", error);
    throw new Error("Failed to create stake session");
  }

  revalidatePath(`/problems/${problemId}`);
  return newSession;
}

export async function resolveStakeSession(sessionId: string, status: "won" | "lost") {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  // Fetch the session to ensure it belongs to the user and is still active
  const { data: session } = await supabase
    .from("stake_sessions")
    .select("*")
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .eq("status", "active")
    .single();

  if (!session) return; // Already resolved or doesn't exist

  const adminClient = createSupabaseAdminClient();

  // Update session status
  await adminClient
    .from("stake_sessions")
    .update({ status })
    .eq("id", sessionId);

  // If lost, deduct money
  if (status === "lost") {
    // 1. Log transaction
    await adminClient.from("transactions").insert({
      user_id: user.id,
      amount_cents: -session.amount_cents,
      type: "stake_lost",
      reference_id: session.problem_id
    });

    // 2. Fetch current wallet balance
    const { data: wallet } = await supabase
      .from("wallets")
      .select("balance_cents")
      .eq("user_id", user.id)
      .single();

    // 3. Deduct from wallet
    if (wallet) {
      await adminClient
        .from("wallets")
        .update({ balance_cents: wallet.balance_cents - session.amount_cents })
        .eq("user_id", user.id);
    }
  }

  revalidatePath(`/problems/${session.problem_id}`);
  revalidatePath(`/wallet`);
}

export async function lazyEvaluateExpiredStakes() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  // Find any active stakes where expires_at is in the past
  const now = new Date().toISOString();
  const { data: expiredSessions } = await supabase
    .from("stake_sessions")
    .select("*")
    .eq("user_id", user.id)
    .eq("status", "active")
    .lt("expires_at", now);

  if (expiredSessions && expiredSessions.length > 0) {
    for (const session of expiredSessions) {
      await resolveStakeSession(session.id, "lost");
    }
  }
}
