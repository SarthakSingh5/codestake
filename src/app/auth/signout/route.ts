import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  
  // Use 302 for POST redirect
  return NextResponse.redirect(new URL("/", request.url), {
    status: 302,
  });
}
