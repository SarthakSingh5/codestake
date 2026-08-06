import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin-client";
import { internalResolveStakeWin, internalFailStakeSession } from "@/lib/internalStake";

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

    if (!userId || !verdict) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400, headers: corsHeaders });
    }

    const adminClient = createSupabaseAdminClient();

    // 1. Determine if this is a Quick Play session or a Challenge Contract
    if (sessionId) {
      // --- QUICK PLAY SESSION LOGIC ---
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

      if (verdict === "EXPIRED" || (session.expires_at && new Date(session.expires_at) < new Date())) {
         await internalFailStakeSession(session.id);
         const { data: w } = await adminClient.from('wallets').select('persona_score').eq('user_id', userId).single();
         if (w) await adminClient.from('wallets').update({ persona_score: (w.persona_score || 0) - 10 }).eq('user_id', userId);
         return NextResponse.json({ success: true, resolvedAs: "lost_expired", personaScore: (w?.persona_score || 0) - 10 }, { headers: corsHeaders });
      }

      if (verdict === "Accepted") {
        await internalResolveStakeWin(session.id);
        const { data: w } = await adminClient.from('wallets').select('persona_score').eq('user_id', userId).single();
        if (w) await adminClient.from('wallets').update({ persona_score: (w.persona_score || 0) + 5 }).eq('user_id', userId);
        return NextResponse.json({ success: true, resolvedAs: "won", personaScore: (w?.persona_score || 0) + 5 }, { headers: corsHeaders });
      } else {
        if (session.mode === "one_shot") {
          await internalFailStakeSession(session.id);
          const { data: w } = await adminClient.from('wallets').select('persona_score').eq('user_id', userId).single();
          if (w) await adminClient.from('wallets').update({ persona_score: (w.persona_score || 0) - 10 }).eq('user_id', userId);
          return NextResponse.json({ success: true, resolvedAs: "lost_one_shot", personaScore: (w?.persona_score || 0) - 10 }, { headers: corsHeaders });
        } else {
          return NextResponse.json({ success: true, resolvedAs: "continue" }, { headers: corsHeaders });
        }
      }
    } else {
      // --- MACRO STAKE (CONTRACT) LOGIC ---
      if (verdict === "Accepted") {
        // Fetch active contract
        const { data: contract } = await adminClient
          .from("challenge_contracts")
          .select("*")
          .eq("user_id", userId)
          .eq("status", "active")
          .single();

        if (contract) {
          if (new Date(contract.expires_at) < new Date()) {
            // Timezone/Late Exploit Blocked: Timer expired before this submission.
            await adminClient.rpc('incur_debt', { p_user_id: userId, p_amount: contract.penalty_cents });
            await adminClient.from("challenge_contracts").update({ status: 'failed' }).eq("id", contract.id);
            const { data: w } = await adminClient.from('wallets').select('persona_score').eq('user_id', userId).single();
            if (w) await adminClient.from('wallets').update({ persona_score: (w.persona_score || 0) - 10 }).eq('user_id', userId);
            return NextResponse.json({ success: true, resolvedAs: "lost_expired", personaScore: (w?.persona_score || 0) - 10 }, { headers: corsHeaders });
          }

          const newSolvedToday = contract.problems_solved_today + 1;
          const newTotalSolved = contract.total_problems_solved + 1;
          
          let newStatus = contract.status;
          if (contract.mode === 'gauntlet' && newTotalSolved >= contract.target_problems_per_day) {
            newStatus = 'completed';
          }

          // Increment problems solved today
          await adminClient
            .from("challenge_contracts")
            .update({ 
              problems_solved_today: newSolvedToday,
              total_problems_solved: newTotalSolved,
              status: newStatus,
              last_updated_at: new Date().toISOString()
            })
            .eq("id", contract.id);

          const { data: w } = await adminClient.from('wallets').select('persona_score').eq('user_id', userId).single();
          if (w) await adminClient.from('wallets').update({ persona_score: (w.persona_score || 0) + 5 }).eq('user_id', userId);

          let resolvedAs = 'contract_progress';
          if (newStatus === 'completed') {
            resolvedAs = 'contract_completed';
          } else if (contract.mode === 'blood_pact' && newSolvedToday >= contract.target_problems_per_day) {
            resolvedAs = 'daily_quota_met';
          }

          return NextResponse.json({ success: true, resolvedAs, personaScore: (w?.persona_score || 0) + 5 }, { headers: corsHeaders });
        }
      }
      return NextResponse.json({ success: true, resolvedAs: "continue" }, { headers: corsHeaders });
    }

  } catch (error) {
    console.error("Resolve API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500, headers: corsHeaders }
    );
  }
}
