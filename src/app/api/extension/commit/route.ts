import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin-client";
import { revalidatePath } from "next/cache";

// Allow CORS for the extension
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
    const { userId, problemId, amountCents, mode, durationMinutes } = body;

    if (!userId || !problemId || !amountCents || !mode || !durationMinutes) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400, headers: corsHeaders });
    }

    const adminClient = createSupabaseAdminClient();

    // 0. The extension sends the problemSlug, but we need the UUID
    let actualProblemId: string;

    const { data: existingProblem } = await adminClient
      .from("problems")
      .select("id")
      .eq("platform", "leetcode") // The extension currently runs on LeetCode
      .eq("slug", problemId)
      .single();

    if (existingProblem) {
      actualProblemId = existingProblem.id;
    } else {
      // Auto-import the external problem
      const formattedTitle = problemId
        .split('-')
        .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

      const { data: newProblem, error: insertError } = await adminClient
        .from("problems")
        .upsert({
          slug: problemId,
          title: formattedTitle,
          platform: 'leetcode',
          description: 'External problem imported from LeetCode.'
        }, { onConflict: 'platform,slug' })
        .select("id")
        .single();
        
      if (insertError || !newProblem) {
        console.error("Failed to auto-import problem:", insertError);
        return NextResponse.json({ error: "Failed to auto-import problem. " + insertError?.message }, { status: 500, headers: corsHeaders });
      }
      actualProblemId = newProblem.id;
    }

    // 1. Check if an active session already exists for this problem
    const { data: existing } = await adminClient
      .from("stake_sessions")
      .select("id")
      .eq("user_id", userId)
      .eq("problem_id", actualProblemId)
      .eq("status", "active")
      .single();

    if (existing) {
      return NextResponse.json({ error: "Active session already exists" }, { status: 400, headers: corsHeaders });
    }

    // 2. ATOMIC ESCROW: Instantly deduct the money from the wallet.
    const { data: deductSuccess, error: rpcError } = await adminClient.rpc('deduct_wallet_balance', {
      p_user_id: userId,
      p_amount: amountCents
    });

    if (rpcError || !deductSuccess) {
      return NextResponse.json({ error: "Insufficient funds or transaction failed" }, { status: 400, headers: corsHeaders });
    }

    // 3. Log the transaction
    await adminClient.from("transactions").insert({
      user_id: userId,
      amount_cents: -amountCents,
      type: "stake_placed",
      reference_id: actualProblemId
    });

    // 4. Create the session
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + durationMinutes);

    const { data: newSession, error } = await adminClient
      .from("stake_sessions")
      .insert({
        user_id: userId,
        problem_id: actualProblemId,
        amount_cents: amountCents,
        mode: mode,
        status: "active",
        expires_at: mode === 'one_shot' ? null : expiresAt.toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error("Supabase Error:", error);
      return NextResponse.json({ error: "Failed to create stake session: " + error.message }, { status: 500, headers: corsHeaders });
    }

    revalidatePath(`/problems/${problemId}`); // Still use the slug here for revalidatePath if the route is /problems/[slug]
    return NextResponse.json({ success: true, session: newSession }, { status: 200, headers: corsHeaders });
  } catch (err: any) {
    console.error("Extension Commit Error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 400, headers: corsHeaders });
  }
}
