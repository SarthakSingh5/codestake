import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import { NextResponse } from "next/server";

/**
 * OAuth callback handler.
 *
 * After a user signs in with Google (or any OAuth provider), Supabase
 * redirects them here with a `?code=` query param. This route:
 *   1. Exchanges the code for a session (sets auth cookies)
 *   2. Checks the user's role from the profiles table
 *   3. Redirects admin → /admin, regular user → /
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createSupabaseServerClient();

    // Exchange the OAuth code for a session
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Session is now set — check the user's role
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();

        // Redirect based on role
        const destination = profile?.role === "admin" ? "/admin" : "/";
        return NextResponse.redirect(new URL(destination, origin));
      }

      // User exists but couldn't fetch profile — go to home
      return NextResponse.redirect(new URL("/", origin));
    }
  }

  // Something went wrong — redirect to login with an error hint
  return NextResponse.redirect(new URL("/login", request.url));
}
