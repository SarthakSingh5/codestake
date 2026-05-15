import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createSupabaseProxyClient } from "@/lib/supabase/proxy-client";

// ── Routes configuration ────────────────────────────────────────────────────
const AUTH_ROUTES = ["/login", "/signup"];
const ADMIN_ROUTES_PREFIX = "/admin";

// ── Proxy function (replaces middleware in Next.js 16) ──────────────────────
export async function proxy(request: NextRequest) {
  const { supabase, response } = createSupabaseProxyClient(request);
  const { pathname } = request.nextUrl;

  // 1. Refresh the session (updates cookies if tokens were refreshed)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // ── Auth routes: /login, /signup ──────────────────────────────────────────
  // If the user is already logged in, redirect them away from auth pages
  if (AUTH_ROUTES.includes(pathname) && user) {
    // Check role to decide where to send them
    const role = await getUserRole(supabase, user.id);

    const destination = role === "admin" ? "/admin" : "/";
    return NextResponse.redirect(new URL(destination, request.url));
  }

  // ── Admin routes: /admin/* ────────────────────────────────────────────────
  if (pathname.startsWith(ADMIN_ROUTES_PREFIX)) {
    // Not logged in → send to login
    if (!user) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    // Logged in but not admin → send to home
    const role = await getUserRole(supabase, user.id);
    if (role !== "admin") {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  // ── Root route: / ────────────────────────────────────────────────────────
  // If an admin visits the root, redirect them to /admin
  if (pathname === "/" && user) {
    const role = await getUserRole(supabase, user.id);
    if (role === "admin") {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
  }

  // ── Default: continue to the requested page ──────────────────────────────
  return response();
}

// ── Helper: fetch user role from profiles table ─────────────────────────────
async function getUserRole(
  supabase: Awaited<ReturnType<typeof createSupabaseProxyClient>>["supabase"],
  userId: string
): Promise<string> {
  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();

  return data?.role ?? "user";
}

// ── Matcher: only run proxy on relevant routes ──────────────────────────────
export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     * - public assets (images, svgs, etc.)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
