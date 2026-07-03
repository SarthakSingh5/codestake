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
