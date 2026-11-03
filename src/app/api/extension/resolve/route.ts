import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin-client";
import { internalResolveStakeWin, internalFailStakeSession, internalResolveContracts } from "@/lib/internalStake";

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
    const body = await request.json();
    const { userId, sessionId, verdict, problemSlug } = body;

    if (!userId || !verdict) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400, headers: corsHeaders });
    }

    const adminClient = createSupabaseAdminClient();

    // ── CASE 1: EXPIRED TRIGGER ──────────────────────────────────────────────
    if (verdict === "EXPIRED") {
      if (sessionId) {
        const { data: session } = await adminClient.from('stake_sessions').select('*').eq('id', sessionId).single();
        await internalFailStakeSession(sessionId);
        const { data: w } = await adminClient.from('wallets').select('persona_score').eq('user_id', userId).single();
        if (w) await adminClient.from('wallets').update({ persona_score: (w.persona_score || 0) - 10 }).eq('user_id', userId);
        return NextResponse.json({
          success: true,
          resolvedAs: "lost_expired",
          title: "DEFEAT",
          text: "Timer Expired. Stake Lost.",
          items: [{ type: 'defeat', text: `Time Expired: $${session ? (session.amount_cents / 100).toFixed(2) : '5.00'} debt incurred` }],
          personaScore: (w?.persona_score || 0) - 10
        }, { headers: corsHeaders });
      }
      return NextResponse.json({ success: true, resolvedAs: "lost_expired", title: "DEFEAT", text: "Timer Expired. Stake Lost." }, { headers: corsHeaders });
    }

    // ── CASE 2: NON-ACCEPTED VERDICT (Wrong Answer, TLE, etc.) ───────────────
    if (verdict !== "Accepted") {
      if (sessionId) {
        const { data: session } = await adminClient
          .from("stake_sessions")
          .select("*")
          .eq("id", sessionId)
          .eq("user_id", userId)
          .eq("status", "active")
          .single();

        if (session && session.mode === "one_shot") {
          await internalFailStakeSession(session.id);
          const { data: w } = await adminClient.from('wallets').select('persona_score').eq('user_id', userId).single();
          if (w) await adminClient.from('wallets').update({ persona_score: (w.persona_score || 0) - 10 }).eq('user_id', userId);
          return NextResponse.json({
            success: true,
            resolvedAs: "lost_one_shot",
            title: "DEFEAT",
            text: "Wrong Answer. One-Shot Stake Lost.",
            items: [{ type: 'defeat', text: `One-Shot Stake Lost: $${(session.amount_cents / 100).toFixed(2)} debt incurred` }],
            personaScore: (w?.persona_score || 0) - 10
          }, { headers: corsHeaders });
        }
      }
      // If time_crunch or no session, just continue silently (do not interrupt user)
      return NextResponse.json({ success: true, resolvedAs: "none" }, { headers: corsHeaders });
    }

    // ── CASE 3: ACCEPTED (REAL SUBMIT PASSED) ─────────────────────────────────
    // An accepted submit MUST:
    // 1. Resolve active Quick Play session (if one exists for this problem)
    // 2. Add +1 to EVERY active Challenge Contract (Blood Pact, Gauntlet, etc.) running for this user,
    //    with strict anti-cheat deduplication!

    // Resolve or auto-import the problem ID
    let currentProblemId: string | null = null;
    if (problemSlug) {
      const formattedTitle = problemSlug
        .split('-')
        .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');

      const { data: p } = await adminClient
        .from('problems')
        .upsert({
          slug: problemSlug,
          title: formattedTitle,
          platform: 'leetcode',
          description: 'External problem imported from LeetCode.'
        }, { onConflict: 'platform,slug' })
        .select('id')
        .single();

      if (p) currentProblemId = p.id;
    } else if (sessionId) {
      const { data: s } = await adminClient
        .from('stake_sessions')
        .select('problem_id')
        .eq('id', sessionId)
        .single();
      if (s) currentProblemId = s.problem_id;
    }

    let quickPlayWon = false;
    let quickPlayBonus = 0;
    let activeSessionData: any = null;

    // 1. Evaluate Quick Play session
    if (sessionId) {
      const { data: session } = await adminClient
        .from("stake_sessions")
        .select("*")
        .eq("id", sessionId)
        .eq("user_id", userId)
        .eq("status", "active")
        .single();

      if (session) {
        activeSessionData = session;
        if (session.expires_at && new Date(session.expires_at) < new Date()) {
          // Time expired before submission
          await internalFailStakeSession(session.id);
        } else {
          await internalResolveStakeWin(session.id);
          quickPlayWon = true;
          quickPlayBonus = 5;
        }
      }
    }

    // 2. Evaluate ALL active Challenge Contracts with anti-cheat deduplication
    let contractRes = {
      contractsCountUpdated: 0,
      duplicatesCount: 0,
      anyContractCompleted: false,
      anyDailyQuotaMet: false,
      personaBonus: 0,
      items: [] as Array<{ type: 'victory' | 'progress' | 'duplicate'; mode: string; text: string }>,
    };

    if (currentProblemId) {
      contractRes = await internalResolveContracts(userId, currentProblemId, problemSlug);
    }

    // 3. Update User Persona Score
    let finalPersonaScore = 0;
    const totalBonus = quickPlayBonus + contractRes.personaBonus;
    const { data: w } = await adminClient.from('wallets').select('persona_score').eq('user_id', userId).single();
    if (w) {
      finalPersonaScore = (w.persona_score || 0) + totalBonus;
      if (totalBonus > 0) {
        await adminClient.from('wallets').update({ persona_score: finalPersonaScore }).eq('user_id', userId);
      }
    }

    // 4. Construct Unified Itemized Notification
    const allItems: Array<{ type: 'victory' | 'progress' | 'duplicate'; text: string }> = [];

    if (quickPlayWon && activeSessionData) {
      allItems.push({
        type: 'victory',
        text: `Quick Play: WON ($${(activeSessionData.amount_cents / 100).toFixed(2)} refunded) 💰`
      });
    }

    if (contractRes.items && contractRes.items.length > 0) {
      allItems.push(...contractRes.items.map(i => ({ type: i.type, text: i.text })));
    }

    const hasVictory = allItems.some(i => i.type === 'victory');
    const hasProgress = allItems.some(i => i.type === 'progress');
    const hasDuplicate = allItems.some(i => i.type === 'duplicate');

    let resolvedAs = 'none';
    let title = '';
    let messageText = '';

    if (hasVictory) {
      resolvedAs = 'victory';
      title = 'VICTORY';
      messageText = hasProgress
        ? 'Challenge Conquered & Other Challenges Advanced!'
        : 'Challenge Victory!';
    } else if (hasProgress) {
      resolvedAs = 'progress';
      title = 'CHALLENGE PROGRESS';
      messageText = 'Challenge quota advancing.';
    } else if (hasDuplicate) {
      resolvedAs = 'duplicate_solve';
      title = 'DUPLICATE SOLVE';
      messageText = 'You have already credited this problem for your active challenge. Solve a distinct problem to advance!';
    } else {
      // No active quickplay or challenges affected: SILENCE!
      resolvedAs = 'none';
    }

    return NextResponse.json({
      success: true,
      resolvedAs,
      title,
      text: messageText,
      items: allItems,
      personaScore: finalPersonaScore
    }, { headers: corsHeaders });

  } catch (error) {
    console.error("Resolve API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500, headers: corsHeaders }
    );
  }
}
