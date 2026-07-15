import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin-client";

export const dynamic = 'force-dynamic';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400, headers: corsHeaders });
    }

    const adminClient = createSupabaseAdminClient();

    // Fetch all active sessions for this user, joining the problems table to get title/platform
    const { data: sessions, error } = await adminClient
      .from("stake_sessions")
      .select(`
        *,
        problems (
          title,
          slug,
          platform
        )
      `)
      .eq("user_id", userId)
      .eq("status", "active");

    if (error) {
      console.error("Error fetching sessions:", error);
      return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders });
    }

    return NextResponse.json({ sessions: sessions || [] }, { headers: corsHeaders });
  } catch (error) {
    console.error("Session fetch error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500, headers: corsHeaders });
  }
}
