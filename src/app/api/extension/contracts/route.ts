import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin-client";
import { internalSweepExpiredSessions, internalSweepExpiredContracts } from "@/lib/internalStake";
import { getLocalMidnightUTC } from "@/lib/timezone";

export const dynamic = 'force-dynamic';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
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
      return NextResponse.json({ error: "Missing userId" }, { status: 400, headers: corsHeaders });
    }

    // Lazy evaluation sweep for all expired sessions and contracts
    await internalSweepExpiredSessions(userId);
    const activeContracts = await internalSweepExpiredContracts(userId);

    return NextResponse.json({ contracts: activeContracts }, { status: 200, headers: corsHeaders });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500, headers: corsHeaders });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, mode, targetDays, targetProblemsPerDay, penaltyCents, timeZone } = body;

    if (!userId || !mode) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400, headers: corsHeaders });
    }

    const supabase = createSupabaseAdminClient();

    // 1. Check if they already have an active contract of this mode
    const { data: existing } = await supabase
      .from('challenge_contracts')
      .select('id')
      .eq('user_id', userId)
      .eq('mode', mode)
      .eq('status', 'active')
      .single();

    if (existing) {
      return NextResponse.json({ error: `You already have an active ${mode === 'blood_pact' ? 'Blood Pact' : 'Gauntlet'}.` }, { status: 400, headers: corsHeaders });
    }

    // 2. Calculate Expiration
    let expiresAt: Date;
    
    if (mode === 'blood_pact') {
      // Aligns to 11:59:59 PM in user's detected local timezone (with grace period if after 8 PM)
      expiresAt = getLocalMidnightUTC(timeZone || 'UTC', 0, true);
    } else if (mode === 'gauntlet') {
      const durationMinutes = body.durationMinutes !== undefined && body.durationMinutes !== null ? body.durationMinutes : 180;
      expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + durationMinutes);
    } else {
      expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);
    }

    // 3. Create the contract
    const { data: newContract, error } = await supabase
      .from('challenge_contracts')
      .insert([{
        user_id: userId,
        mode,
        target_days: targetDays || 1,
        target_problems_per_day: targetProblemsPerDay || 1,
        penalty_cents: penaltyCents !== undefined && penaltyCents !== null ? penaltyCents : 5000,
        expires_at: expiresAt.toISOString()
      }])
      .select()
      .single();

    if (error) throw new Error(error.message);

    return NextResponse.json({ contract: newContract }, { status: 200, headers: corsHeaders });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500, headers: corsHeaders });
  }
}
