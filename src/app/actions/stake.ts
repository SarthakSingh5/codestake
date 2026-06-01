"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import { createSupabaseAdminClient } from "@/lib/supabase/admin-client";
import { revalidatePath } from "next/cache";

export async function createStakeSession(problemId: string, amountCents: number, mode: string, durationMinutes: number) {
  if (amountCents <= 0) throw new Error("Invalid stake amount");

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  // 1. Check if an active session already exists for this problem
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

  const adminClient = createSupabaseAdminClient();

  // 2. ATOMIC ESCROW: Instantly deduct the money from the wallet.
  // This completely stops race conditions and infinite stake exploits.
  const { data: deductSuccess, error: rpcError } = await adminClient.rpc('deduct_wallet_balance', {
    p_user_id: user.id,
    p_amount: amountCents
  });

  if (rpcError || !deductSuccess) {
    throw new Error("Insufficient funds or transaction failed");
  }

  // 3. Log the transaction
  await adminClient.from("transactions").insert({
    user_id: user.id,
    amount_cents: -amountCents,
    type: "stake_placed",
    reference_id: problemId
  });

  // 4. Create the session
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + durationMinutes);

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

export async function failStakeSession(sessionId: string) {
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

  // Update session status to lost. 
  // We do NOT deduct money here because it was already taken in escrow!
  await adminClient
    .from("stake_sessions")
    .update({ status: "lost" })
    .eq("id", sessionId);

  revalidatePath(`/problems/${session.problem_id}`);
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
      await failStakeSession(session.id);
    }
  }
}
