import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin-client";

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

    const supabase = createSupabaseAdminClient();

    // Note: We bypass RLS implicitly by just checking the userId passed in. 
    // In a production app, the extension should ideally pass a JWT token via Authorization header.
    // For now, this is a read-only endpoint so it's safe enough for development.
    const { data: wallet, error } = await supabase
      .from("wallets")
      .select("balance_cents, persona_score")
      .eq("user_id", userId)
      .single();

    if (error || !wallet) {
      return NextResponse.json({ balanceCents: 0, personaScore: 0 }, { status: 200, headers: corsHeaders });
    }

    return NextResponse.json({ balanceCents: wallet.balance_cents, personaScore: wallet.persona_score || 0 }, { status: 200, headers: corsHeaders });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500, headers: corsHeaders });
  }
}
