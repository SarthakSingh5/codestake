"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import { revalidatePath } from "next/cache";

export async function toggleHardcoreMode(enabled: boolean) {
  const supabase = await createSupabaseServerClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { error } = await supabase
    .from("profiles")
    .update({ is_hardcore_mode_enabled: enabled })
    .eq("id", user.id);

  if (error) {
    console.error("Failed to toggle hardcore mode:", error);
    throw new Error("Failed to update profile");
  }

  // Revalidate so the navbar and problems page update immediately
  revalidatePath("/", "layout");
}
