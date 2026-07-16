import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin-client";

export const dynamic = 'force-dynamic';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(request: Request) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400, headers: corsHeaders });
    }

    const adminClient = createSupabaseAdminClient();

    // 1. Mark the wallet as permanently banned
    const { error: walletError } = await adminClient
      .from("wallets")
      .update({ is_banned: true })
      .eq("user_id", userId);

    if (walletError) {
      console.error("Failed to ban wallet:", walletError);
      return NextResponse.json({ error: "Failed to ban wallet" }, { status: 500, headers: corsHeaders });
    }

    // 2. Ban the user at the authentication level for 100 years
    const { error: banError } = await adminClient.auth.admin.updateUserById(
      userId,
      { ban_duration: '876000h' }
    );

    if (banError) {
      console.error("Failed to ban auth user:", banError);
    }

    return NextResponse.json({ success: true }, { headers: corsHeaders });
  } catch (error) {
    console.error("Ban API error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500, headers: corsHeaders });
  }
}
