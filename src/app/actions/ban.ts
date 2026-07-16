"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import { createSupabaseAdminClient } from "@/lib/supabase/admin-client";

export async function exileUser() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  const adminClient = createSupabaseAdminClient();

  // 1. Mark the wallet as permanently banned
  const { error: walletError } = await adminClient
    .from("wallets")
    .update({ is_banned: true })
    .eq("user_id", user.id);

  if (walletError) {
    console.error("Failed to ban wallet:", walletError);
    throw new Error("Failed to ban wallet");
  }

  // 2. Ban the user at the authentication level for 100 years
  const { error: banError } = await adminClient.auth.admin.updateUserById(
    user.id,
    { ban_duration: '876000h' }
  );

  if (banError) {
    console.error("Failed to ban auth user:", banError);
    // Continue anyway since the wallet is banned, which middleware will enforce
  }

  // 3. Force sign out of the current session
  await supabase.auth.signOut();

  return { success: true };
}
