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
    const problemSlug = searchParams.get('problemSlug');

    if (!userId || !problemSlug) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400, headers: corsHeaders });
    }

    const adminClient = createSupabaseAdminClient();

    // 1. Get the problem UUID
    const { data: problem } = await adminClient
      .from("problems")
      .select("id")
      .eq("platform", "leetcode")
      .eq("slug", problemSlug)
      .single();

    if (!problem) {
      return NextResponse.json({ activeSession: null }, { headers: corsHeaders });
    }

    // 2. Look for an active session for this user on this problem
    const { data: session } = await adminClient
      .from("stake_sessions")
      .select("*")
      .eq("user_id", userId)
      .eq("problem_id", problem.id)
      .eq("status", "active")
      .single();

    if (!session) {
      return NextResponse.json({ activeSession: null }, { headers: corsHeaders });
    }

    // Return the session so the frontend can resume tracking
    return NextResponse.json({ activeSession: session }, { headers: corsHeaders });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders });
  }
}
