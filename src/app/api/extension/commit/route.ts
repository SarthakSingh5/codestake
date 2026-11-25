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

    if (!userId || !problemId || amountCents === undefined || amountCents === null || amountCents < 0 || !mode || !durationMinutes) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400, headers: corsHeaders });
    }

    const adminClient = createSupabaseAdminClient();

    // 0. The extension sends the problemSlug, but we need the UUID
    const cleanSlug = problemId.toLowerCase().trim();
    let actualProblemId: string;

    const { data: existingProblem } = await adminClient
      .from("problems")
      .select("id")
      .eq("slug", cleanSlug)
      .maybeSingle();

    if (existingProblem) {
      actualProblemId = existingProblem.id;
    } else {
      // Auto-import external LeetCode problem as unlisted (is_published: false)
      // so it never appears in the Arena or Admin problems dashboard!
      const formattedTitle = cleanSlug
        .split('-')
        .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

      const { data: newProblem, error: insertError } = await adminClient
        .from("problems")
        .upsert({
          slug: cleanSlug,
          title: formattedTitle,
          platform: 'leetcode',
          is_published: false,
          description: 'External problem imported from LeetCode.'
        }, { onConflict: 'platform,slug' })
        .select("id")
        .single();

      if (insertError || !newProblem) {
        console.error("Failed to auto-import external problem:", insertError);
        return NextResponse.json({ error: "Failed to initialize external problem: " + insertError?.message }, { status: 500, headers: corsHeaders });
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
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: "An active Quick Play session is already running for this problem." }, { status: 400, headers: corsHeaders });
    }

    // 2. The Code of Omerta: Check for unpaid debt or bans
    const { data: wallet } = await adminClient
      .from("wallets")
      .select("balance_cents, is_banned")
      .eq("user_id", userId)
      .single();

    if (wallet?.is_banned) {
      return NextResponse.json({ error: "Your account is currently banned." }, { status: 403, headers: corsHeaders });
    }

    if (!wallet || wallet.balance_cents < 0) {
      return NextResponse.json({ error: "You have an unsettled debt. Pay your debt to return to the arena." }, { status: 403, headers: corsHeaders });
    }

    // 3. No upfront escrow! The user only pays if they fail.

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

    // Temporarily disabled revalidatePath because it blocks the response for 12+ seconds in dev mode, causing the extension to time out.
    // revalidatePath(`/problems/${problemId}`); 
    
    return NextResponse.json({ success: true, session: newSession }, { status: 200, headers: corsHeaders });
  } catch (err: any) {
    console.error("Extension Commit Error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 400, headers: corsHeaders });
  }
}
