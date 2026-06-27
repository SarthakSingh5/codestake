import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin-client";
import { internalResolveStakeWin } from "@/lib/internalStake";
import { failStakeSession } from "@/app/actions/stake";

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
    const body = await request.json();
    const { userId, sessionId, verdict } = body;

    if (!userId || !sessionId || !verdict) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400, headers: corsHeaders });
    }

    const adminClient = createSupabaseAdminClient();

    // 1. Verify the session belongs to the user and is active
    const { data: session } = await adminClient
      .from("stake_sessions")
      .select("*")
      .eq("id", sessionId)
      .eq("user_id", userId)
      .eq("status", "active")
      .single();

    if (!session) {
      return NextResponse.json({ error: "Session not found or already resolved" }, { status: 404, headers: corsHeaders });
    }

    // 2. Check if the session has expired natively OR the client explicitly reported expiration
    if (verdict === "EXPIRED" || new Date(session.expires_at) < new Date()) {
       await failStakeSession(session.id);
       return NextResponse.json({ success: true, resolvedAs: "lost_expired" }, { headers: corsHeaders });
    }

    // 3. Process the verdict
    if (verdict === "Accepted") {
      // The user successfully solved it! Call the secure internal win function.
      await internalResolveStakeWin(session.id);
      return NextResponse.json({ success: true, resolvedAs: "won" }, { headers: corsHeaders });
    } 
    else {
      // The user failed (Wrong Answer, Runtime Error, etc)
      if (session.mode === "one_shot") {
        // One Shot: Instant failure
        await failStakeSession(session.id);
        return NextResponse.json({ success: true, resolvedAs: "lost_one_shot" }, { headers: corsHeaders });
      } else {
        // Time Crunch: They can keep trying until the timer runs out
        return NextResponse.json({ success: true, resolvedAs: "continue" }, { headers: corsHeaders });
      }
    }

  } catch (error) {
    console.error("Resolve API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500, headers: corsHeaders }
    );
  }
}
