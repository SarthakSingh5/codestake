import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin-client";
import {
  internalResolveStakeWin,
  internalFailStakeSession,
  internalResolveContracts,
  internalSweepExpiredContractsWithDetails
} from "@/lib/internalStake";

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
      const items: Array<{ type: string; text: string }> = [];

      // 1. Resolve expired session if active
      if (sessionId) {
        const { data: session } = await adminClient.from('stake_sessions').select('*').eq('id', sessionId).single();
        await internalFailStakeSession(sessionId);
        items.push({
          type: 'defeat',
          text: `Time Expired: $${session ? (session.amount_cents / 100).toFixed(2) : '5.00'} debt incurred`
        });
      }

      // 2. Sweep any expired challenge contracts for this user
      const { newlyFailedContracts } = await internalSweepExpiredContractsWithDetails(userId);
      for (const fc of newlyFailedContracts) {
        const modeTitle = fc.mode === 'blood_pact' ? 'Blood Pact' : fc.mode === 'gauntlet' ? 'Gauntlet' : 'Challenge';
        items.push({
          type: 'defeat',
          text: `${modeTitle} Expired: $${(fc.penalty_cents / 100).toFixed(2)} debt incurred`
        });
      }

      if (items.length === 0) {
        items.push({
          type: 'defeat',
          text: 'Timer Expired. Stake Lost.'
        });
      }

      const { data: w } = await adminClient.from('wallets').select('persona_score').eq('user_id', userId).single();
      if (w) await adminClient.from('wallets').update({ persona_score: (w.persona_score || 0) - 10 }).eq('user_id', userId);

      return NextResponse.json({
        success: true,
        resolvedAs: "lost_expired",
        title: "DEFEAT",
        text: "Timer Expired. Stake Lost.",
        items,
        personaScore: (w?.persona_score || 0) - 10
      }, { headers: corsHeaders });
    }

    // ── CASE 2: NON-ACCEPTED VERDICT (Wrong Answer, TLE, etc.) ───────────────
    if (verdict !== "Accepted") {
      const items: Array<{ type: string; text: string }> = [];

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
          items.push({
            type: 'defeat',
            text: `One-Shot Stake Lost: $${(session.amount_cents / 100).toFixed(2)} debt incurred`
          });
        }
      }

      // Also sweep any expired challenge contracts for this user!
      const { newlyFailedContracts } = await internalSweepExpiredContractsWithDetails(userId);
      for (const fc of newlyFailedContracts) {
        const modeTitle = fc.mode === 'blood_pact' ? 'Blood Pact' : fc.mode === 'gauntlet' ? 'Gauntlet' : 'Challenge';
        items.push({
          type: 'defeat',
          text: `${modeTitle} Expired: $${(fc.penalty_cents / 100).toFixed(2)} debt incurred`
        });
      }

      if (items.length > 0) {
        const { data: w } = await adminClient.from('wallets').select('persona_score').eq('user_id', userId).single();
        if (w) await adminClient.from('wallets').update({ persona_score: (w.persona_score || 0) - 10 }).eq('user_id', userId);
        return NextResponse.json({
          success: true,
          resolvedAs: "lost_expired",
          title: "DEFEAT",
          text: "Challenge Expired. Stake Lost.",
          items,
          personaScore: (w?.persona_score || 0) - 10
        }, { headers: corsHeaders });
      }

      // If time_crunch or no session, and no contracts expired, continue silently
      return NextResponse.json({ success: true, resolvedAs: "none" }, { headers: corsHeaders });
    }

    // ── CASE 3: ACCEPTED (REAL SUBMIT PASSED) ─────────────────────────────────
    // An accepted submit MUST:
    // 1. Resolve active Quick Play session (if one exists for this problem)
    // 2. Add +1 to EVERY active Challenge Contract (Blood Pact, Gauntlet, etc.) running for this user,
    //    with strict anti-cheat deduplication!

    // Resolve problem ID (or auto-import external LeetCode problem as unlisted)
    let currentProblemId: string | null = null;
    if (problemSlug) {
      const cleanSlug = problemSlug.toLowerCase().trim();
      const { data: p } = await adminClient
        .from('problems')
        .select('id')
        .eq('slug', cleanSlug)
        .maybeSingle();

      if (p) {
        currentProblemId = p.id;
      } else {
        const formattedTitle = cleanSlug
          .split('-')
          .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ');

        const { data: newP } = await adminClient
          .from('problems')
          .upsert({
            slug: cleanSlug,
            title: formattedTitle,
            platform: 'leetcode',
            is_published: false,
            description: 'External problem imported from LeetCode.'
          }, { onConflict: 'platform,slug' })
          .select('id')
          .maybeSingle();

        if (newP) currentProblemId = newP.id;
      }
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
