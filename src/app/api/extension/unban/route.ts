import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin-client";

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const adminClient = createSupabaseAdminClient();
    const userId = "b6d68ba0-3976-4f8b-803a-e4c61f3bfa67"; // Hardcoded for you!

    // Unban Auth
    const { error: authError } = await adminClient.auth.admin.updateUserById(userId, {
      ban_duration: 'none'
    });

    if (authError) throw authError;

    // Unban DB
    const { error: dbError } = await adminClient
      .from('wallets')
      .update({ is_banned: false })
      .eq('user_id', userId);

    if (dbError) throw dbError;

    return NextResponse.json({ success: true, message: "Welcome back from exile!" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
