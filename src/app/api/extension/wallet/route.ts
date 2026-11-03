import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin-client";
import { internalSweepExpiredSessions, internalSweepExpiredContracts } from "@/lib/internalStake";

export const dynamic = 'force-dynamic';

// Allow CORS for the extension
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
      return NextResponse.json({ error: "Missing userId" }, { status: 400, headers: corsHeaders });
    }

    // Lazy evaluation sweep for all expired sessions and contracts across the entire platform
    await internalSweepExpiredSessions(userId);
    await internalSweepExpiredContracts(userId);

    const supabase = createSupabaseAdminClient();

    const { data: wallet, error } = await supabase
      .from("wallets")
      .select("balance_cents, persona_score, is_banned")
      .eq("user_id", userId)
      .single();

    if (error || !wallet) {
      return NextResponse.json({ balanceCents: 0, personaScore: 0, isBanned: false }, { status: 200, headers: corsHeaders });
    }

    return NextResponse.json({ 
      balanceCents: wallet.balance_cents,
      personaScore: wallet.persona_score,
      isBanned: wallet.is_banned === true
    }, { 
      status: 200, 
      headers: corsHeaders 
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500, headers: corsHeaders });
  }
}
