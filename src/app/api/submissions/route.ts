import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const problemId = searchParams.get("problemId");

    if (!problemId) {
      return Response.json(
        { error: "Missing problemId parameter" },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { data: submissions, error } = await supabase
      .from("submissions")
      .select("id, language, status, runtime_ms, memory_kb, created_at")
      .eq("user_id", user.id)
      .eq("problem_id", problemId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching submissions:", error);
      return Response.json({ error: "Database error" }, { status: 500 });
    }

    return Response.json({ submissions });
  } catch (error) {
    console.error("Submissions API error:", error);
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
