import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import { notFound, redirect } from "next/navigation";
import Navbar from "../../components/Navbar";
import ProblemWorkspace from "./ProblemWorkspace";

// ── Metadata ─────────────────────────────────────────────────────────────────
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: problem } = await supabase
    .from("problems")
    .select("title, description")
    .eq("slug", slug)
    .eq("is_published", true)
    .single();

  if (!problem) {
    return { title: "Problem Not Found — CodeStake" };
  }

  return {
    title: `${problem.title} — CodeStake`,
    description: problem.description.slice(0, 160),
  };
}

// ── Page ─────────────────────────────────────────────────────────────────────
// This is now a thin server component. It:
//   1. Checks auth
//   2. Fetches the problem + example test cases
//   3. Passes everything to the <ProblemWorkspace> client component
//
// The layout is full-height (fills the viewport below the navbar).

export default async function ProblemDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createSupabaseServerClient();

  // Auth check
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch problem
  const { data: problem } = await supabase
    .from("problems")
    .select("id, title, slug, description, constraints, difficulty, topics, created_at")
    .eq("slug", slug)
    .eq("is_published", true)
    .single();

  if (!problem) notFound();

  // Fetch example test cases
  const { data: exampleTestCases } = await supabase
    .from("example_test_cases")
    .select("id, input, output, explanation, sort_order")
    .eq("problem_id", problem.id)
    .order("sort_order", { ascending: true });

  // Hardcore Mode Data
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_hardcore_mode_enabled")
    .eq("id", user.id)
    .single();

  const { data: wallet } = await supabase
    .from("wallets")
    .select("balance_cents")
    .eq("user_id", user.id)
    .single();

  // Fetch active stake session if one exists
  const { data: activeSession } = await supabase
    .from("stake_sessions")
    .select("*")
    .eq("user_id", user.id)
    .eq("problem_id", problem.id)
    .eq("status", "active")
    .single();

  return (
    <div className="h-screen bg-[#02050b] text-slate-100 flex flex-col overflow-hidden">
      <Navbar hideHardcoreToggle={true} />
      <ProblemWorkspace
        problem={{
          id: problem.id,
          title: problem.title,
          slug: problem.slug,
          description: problem.description,
          constraints: problem.constraints,
          difficulty: problem.difficulty,
          topics: (problem.topics as string[]) ?? [],
        }}
        exampleTestCases={exampleTestCases ?? []}
        isHardcoreModeEnabled={profile?.is_hardcore_mode_enabled ?? false}
        walletBalance={wallet?.balance_cents ?? 0}
        initialActiveSession={activeSession || null}
      />
    </div>
  );
}
