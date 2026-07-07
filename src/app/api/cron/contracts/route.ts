import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin-client";

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    // In production, you would want to verify a secret header so random people can't trigger the cron.
    // const authHeader = request.headers.get('authorization');
    // if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    //   return new Response('Unauthorized', { status: 401 });
    // }

    const adminClient = createSupabaseAdminClient();
    const now = new Date();

    // Find all active contracts where expires_at has passed
    const { data: expiredContracts, error } = await adminClient
      .from('challenge_contracts')
      .select('*')
      .eq('status', 'active')
      .lte('expires_at', now.toISOString());

    if (error) throw new Error(error.message);

    let processed = 0;

    for (const contract of expiredContracts) {
      if (contract.mode === 'blood_pact') {
        // Did they solve enough problems today?
        if (contract.problems_solved_today < contract.target_problems_per_day) {
          // FAILED THE PACT
          await adminClient.rpc('incur_debt', { p_user_id: contract.user_id, p_amount: contract.penalty_cents });
          await adminClient
            .from('challenge_contracts')
            .update({ status: 'failed', last_updated_at: new Date().toISOString() })
            .eq('id', contract.id);
        } else {
          // THEY SURVIVED TODAY
          if (contract.current_day >= contract.target_days) {
            // THEY COMPLETED THE ENTIRE PACT
            await adminClient
              .from('challenge_contracts')
              .update({ status: 'completed', last_updated_at: new Date().toISOString() })
              .eq('id', contract.id);
          } else {
            // SURVIVED TODAY, MOVE TO TOMORROW
            const tomorrow = new Date(contract.expires_at);
            tomorrow.setDate(tomorrow.getDate() + 1); // Add 24 hours
            
            await adminClient
              .from('challenge_contracts')
              .update({ 
                current_day: contract.current_day + 1,
                problems_solved_today: 0, // Reset daily quota
                expires_at: tomorrow.toISOString(),
                last_updated_at: new Date().toISOString()
              })
              .eq('id', contract.id);
          }
        }
      } else if (contract.mode === 'gauntlet') {
        // For Gauntlet, did they solve all 5?
        if (contract.total_problems_solved < contract.target_problems_per_day) { // target_problems_per_day is total target for Gauntlet
           // FAILED
           await adminClient.rpc('incur_debt', { p_user_id: contract.user_id, p_amount: contract.penalty_cents });
           await adminClient
             .from('challenge_contracts')
             .update({ status: 'failed', last_updated_at: new Date().toISOString() })
             .eq('id', contract.id);
        } else {
           // WON (This usually gets marked completed in realtime via the resolve API, but just in case)
           await adminClient
             .from('challenge_contracts')
             .update({ status: 'completed', last_updated_at: new Date().toISOString() })
             .eq('id', contract.id);
        }
      }
      processed++;
    }

    return NextResponse.json({ success: true, processed }, { status: 200 });

  } catch (err: any) {
    console.error("Cron Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
