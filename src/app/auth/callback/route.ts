import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

/**
 * Auth callback handler (OAuth + Email Confirmation).
 *
 * After a user signs in via Google OAuth or clicks a verification link in
 * their confirmation email, Supabase redirects here with either `?code=`
 * (PKCE) or `?token_hash=...&type=...` (OTP link). This route:
 *   1. Exchanges the code or verifies the OTP token for an active session
 *   2. Checks the user's role from the profiles table
 *   3. Redirects admin → /admin, regular user → /extension
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const oauthError =
    searchParams.get("error_description") || searchParams.get("error");

  const supabase = await createSupabaseServerClient();
  let authError: string | null = oauthError;

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    authError = error?.message ?? null;
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });
    authError = error?.message ?? null;
  } else if (!authError) {
    authError = "Missing verification code. Please try signing in again.";
  }

  if (!authError) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      const destination = profile?.role === "admin" ? "/admin" : "/extension";
      return NextResponse.redirect(new URL(destination, origin));
    }

    return NextResponse.redirect(new URL("/extension", origin));
  }

  // Redirect back to login with readable error details
  const loginUrl = new URL("/login", origin);
  loginUrl.searchParams.set("error", authError);
  return NextResponse.redirect(loginUrl);
}
