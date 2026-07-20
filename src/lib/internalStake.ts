import { createSupabaseAdminClient } from "@/lib/supabase/admin-client";

// This file is NOT a Server Action (no "use server" at the top).
// These functions can only be imported and called securely by our own backend API routes.

export async function internalResolveStakeWin(sessionId: string) {
  const adminClient = createSupabaseAdminClient();

  // 1. Fetch the session
  const { data: session } = await adminClient
    .from("stake_sessions")
    .select("*")
    .eq("id", sessionId)
    .eq("status", "active")
    .single();

  if (!session) return;

  // 2. Update status to won
  await adminClient
    .from("stake_sessions")
    .update({ status: "won" })
    .eq("id", sessionId);

  // 3. No refund needed because we didn't take money upfront!
  // No transaction log needed for a win, because the stake_sessions table already tracks wins.
}

export async function internalFailStakeSession(sessionId: string) {
  const adminClient = createSupabaseAdminClient();

  const { data: session } = await adminClient
    .from("stake_sessions")
    .select("*")
    .eq("id", sessionId)
    .eq("status", "active")
    .single();

  if (!session) return;

  await adminClient
    .from("stake_sessions")
    .update({ status: "lost" })
    .eq("id", sessionId);

  const { error: debtError } = await adminClient.rpc('incur_debt', {
    p_user_id: session.user_id,
    p_amount: session.amount_cents
  });
  
  if (debtError) {
    console.error("FATAL: Failed to incur debt for user", session.user_id, debtError);
  }

  const { error: txError } = await adminClient.from("transactions").insert({
    user_id: session.user_id,
    amount_cents: -session.amount_cents,
    type: "stake_lost",
    reference_id: session.problem_id
  });

  if (txError) {
    console.error("FATAL: Failed to log transaction for user", session.user_id, txError);
  }
}
