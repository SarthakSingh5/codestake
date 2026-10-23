import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin-client";
import { internalFailStakeSession } from "@/lib/internalStake";

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

    let activeSessions = [];
    if (sessions && sessions.length > 0) {
      const now = new Date();
      for (const session of sessions) {
        if (session.expires_at && new Date(session.expires_at) < now) {
          // Lazy evaluation: Session has expired! Fail it.
          await internalFailStakeSession(session.id);
          
          // Deduct Persona Score (consistent with resolve API)
          const { data: w } = await adminClient.from('wallets').select('persona_score').eq('user_id', userId).single();
          if (w) await adminClient.from('wallets').update({ persona_score: (w.persona_score || 0) - 10 }).eq('user_id', userId);
        } else {
          activeSessions.push(session);
        }
      }
    }

    return NextResponse.json({ sessions: activeSessions }, { headers: corsHeaders });
  } catch (error) {
    console.error("Session fetch error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500, headers: corsHeaders });
  }
}
