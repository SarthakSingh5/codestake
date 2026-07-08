import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin-client";

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

    const supabase = createSupabaseAdminClient();

    // Fetch the active contract if it exists
    const { data: contract, error } = await supabase
      .from('challenge_contracts')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(error.message);
    }

    if (contract) {
      const now = new Date();
      const expiresAt = new Date(contract.expires_at);

      if (now > expiresAt) {
        // LAZY EVALUATION: Contract timer has expired!
        
        if (contract.problems_solved_today < contract.target_problems_per_day) {
          // FAILURE: Did not meet quota
          await supabase.rpc('incur_debt', {
            p_user_id: userId,
            p_amount: contract.penalty_cents
          });
          
          await supabase.from('challenge_contracts')
            .update({ status: 'failed' })
            .eq('id', contract.id);
            
          return NextResponse.json({ contract: null }, { status: 200, headers: corsHeaders });
        } else {
          // SUCCESS: Met the quota for the day/gauntlet
          if (contract.mode === 'blood_pact') {
            if (contract.current_day < contract.target_days) {
              // Advance to next day
              const nextExpiresAt = new Date(expiresAt);
              nextExpiresAt.setHours(nextExpiresAt.getHours() + 24);
              
              const { data: updatedContract } = await supabase.from('challenge_contracts')
                .update({
                  current_day: contract.current_day + 1,
                  problems_solved_today: 0,
                  expires_at: nextExpiresAt.toISOString()
                })
                .eq('id', contract.id)
                .select()
                .single();
                
              return NextResponse.json({ contract: updatedContract }, { status: 200, headers: corsHeaders });
            } else {
              // Completed the entire Blood Pact!
              await supabase.from('challenge_contracts')
                .update({ status: 'completed' })
                .eq('id', contract.id);
              return NextResponse.json({ contract: null }, { status: 200, headers: corsHeaders });
            }
          } else {
            // Gauntlet completed
            await supabase.from('challenge_contracts')
              .update({ status: 'completed' })
              .eq('id', contract.id);
            return NextResponse.json({ contract: null }, { status: 200, headers: corsHeaders });
          }
        }
      }
    }

    return NextResponse.json({ contract: contract || null }, { status: 200, headers: corsHeaders });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500, headers: corsHeaders });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, mode, targetDays, targetProblemsPerDay, penaltyCents } = body;

    if (!userId || !mode) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400, headers: corsHeaders });
    }

    const supabase = createSupabaseAdminClient();

    // 1. Check if they already have an active contract
    const { data: existing } = await supabase
      .from('challenge_contracts')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    if (existing) {
      return NextResponse.json({ error: "You already have an active challenge contract." }, { status: 400, headers: corsHeaders });
    }

    // 2. Calculate Expiration
    const now = new Date();
    let expiresAt = new Date();
    
    if (mode === 'blood_pact') {
      // Expires at midnight tonight local time (simplest approach: just +24h for now, or true midnight)
      // Since users can be in any timezone, we set expiration to 24 hours from now for V1 simplicity.
      expiresAt.setHours(expiresAt.getHours() + 24);
    } else if (mode === 'gauntlet') {
      // Gauntlet is 3 hours
      expiresAt.setHours(expiresAt.getHours() + 3);
    }

    // 3. Create the contract
    const { data: newContract, error } = await supabase
      .from('challenge_contracts')
      .insert([{
        user_id: userId,
        mode,
        target_days: targetDays || 1,
        target_problems_per_day: targetProblemsPerDay || 1,
        penalty_cents: penaltyCents || 5000,
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
