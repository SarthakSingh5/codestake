import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Creates a Supabase client for use inside Next.js proxy (middleware).
 *
 * Unlike the server-client which uses `cookies()` from `next/headers`,
 * the proxy client reads cookies from the incoming request and writes
 * updated cookies onto the outgoing response. This is necessary because
 * `next/headers` is not available in the proxy context.
 */
export function createSupabaseProxyClient(request: NextRequest) {
  // Start with a "pass-through" response that we'll attach cookies to
  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY"
    );
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        // 1. Set cookies on the request (so downstream server components can read them)
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );

        // 2. Recreate the response with the updated request headers
        response = NextResponse.next({
          request: { headers: request.headers },
        });

        // 3. Set cookies on the response (so the browser stores them)
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  return { supabase, response: () => response };
}
