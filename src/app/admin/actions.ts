"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import { createSupabaseAdminClient } from "@/lib/supabase/admin-client";
import { revalidatePath } from "next/cache";

async function assertAdmin() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");
  
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    throw new Error("Admin privileges required");
  }
  return user;
}

export async function toggleUserBan(targetUserId: string, ban: boolean) {
  await assertAdmin();
  const adminClient = createSupabaseAdminClient();

  const { error } = await adminClient
    .from("wallets")
    .update({ is_banned: ban, updated_at: new Date().toISOString() })
    .eq("user_id", targetUserId);

  if (error) throw new Error("Failed to update ban status: " + error.message);
  revalidatePath("/admin");
  return { success: true };
}

export async function clearUserDebt(targetUserId: string) {
  await assertAdmin();
  const adminClient = createSupabaseAdminClient();

  const { error } = await adminClient
    .from("wallets")
    .update({ balance_cents: 0, updated_at: new Date().toISOString() })
    .eq("user_id", targetUserId);

  if (error) throw new Error("Failed to clear debt: " + error.message);
  revalidatePath("/admin");
  return { success: true };
}

export async function toggleUserRole(targetUserId: string, currentRole: string) {
  await assertAdmin();
  const adminClient = createSupabaseAdminClient();
  const newRole = currentRole === "admin" ? "user" : "admin";

  const { error } = await adminClient
    .from("profiles")
    .update({ role: newRole })
    .eq("id", targetUserId);

  if (error) throw new Error("Failed to update role: " + error.message);
  revalidatePath("/admin");
  return { success: true };
}

export async function setUserPersonaScore(targetUserId: string, score: number) {
  await assertAdmin();
  const adminClient = createSupabaseAdminClient();

  const { error } = await adminClient
    .from("wallets")
    .update({ persona_score: score, updated_at: new Date().toISOString() })
    .eq("user_id", targetUserId);

  if (error) throw new Error("Failed to update persona score: " + error.message);
  revalidatePath("/admin");
  return { success: true };
}
