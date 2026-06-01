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

  // 3. Refund the escrowed money back to the wallet
  const { data: refundSuccess, error: rpcError } = await adminClient.rpc('add_wallet_balance', {
    p_user_id: session.user_id,
    p_amount: session.amount_cents
  });

  if (rpcError || !refundSuccess) {
    console.error("Critical: Failed to refund wallet on stake win", rpcError);
    // In a real production app, we would alert an admin here or queue a retry!
  } else {
    // 4. Log the refund transaction
    await adminClient.from("transactions").insert({
      user_id: session.user_id,
      amount_cents: session.amount_cents,
      type: "stake_refunded",
      reference_id: session.problem_id
    });
  }
}
