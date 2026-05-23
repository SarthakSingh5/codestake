import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import Navbar from "../../components/Navbar";

// ── Difficulty badge colors ──────────────────────────────────────────────────
const difficultyStyles: Record<string, string> = {
  Easy: "bg-emerald-500/15 text-emerald-300 ring-emerald-400/20",
  Medium: "bg-amber-500/15 text-amber-300 ring-amber-400/20",
  Hard: "bg-red-500/15 text-red-300 ring-red-400/20",
};

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

  // Fetch example test cases (RLS ensures only published problem's test cases are visible)
  const { data: exampleTestCases } = await supabase
    .from("example_test_cases")
    .select("id, input, output, explanation, sort_order")
    .eq("problem_id", problem.id)
    .order("sort_order", { ascending: true });

  return (
    <div className="min-h-screen bg-[#02050b] text-slate-100 flex flex-col">
      <Navbar />
      <main className="flex-1 relative">
        {/* Ambient glow */}
        <div
          className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 h-96 w-96 rounded-full blur-3xl opacity-20"
          style={{ background: "radial-gradient(circle, #6366f1 0%, transparent 70%)" }}
          aria-hidden="true"
        />

        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-12 relative">
          {/* Back link */}
          <Link
            href="/problems"
            className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-indigo-300 transition mb-6"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            All Problems
          </Link>

          {/* Problem header */}
          <div className="mb-8">
            <div className="flex flex-wrap items-center gap-3 mb-3">
              <span
                className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ${
                  difficultyStyles[problem.difficulty] ?? ""
                }`}
              >
                {problem.difficulty}
              </span>
              {(problem.topics as string[])?.map((topic: string) => (
                <span
                  key={topic}
                  className="rounded-full bg-indigo-500/10 px-2.5 py-0.5 text-xs font-medium text-indigo-300 ring-1 ring-indigo-400/20"
                >
                  {topic}
                </span>
              ))}
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white">
              {problem.title}
            </h1>
          </div>

          {/* Problem description */}
          <div className="rounded-2xl border border-white/10 bg-[#0b0f1e]/80 backdrop-blur p-6 mb-6">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">
              Description
            </h2>
            <div className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">
              {problem.description}
            </div>
          </div>

          {/* Constraints */}
          {problem.constraints && (
            <div className="rounded-2xl border border-white/10 bg-[#0b0f1e]/80 backdrop-blur p-6 mb-6">
              <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">
                Constraints
              </h2>
              <div className="text-sm text-slate-300 font-mono leading-relaxed whitespace-pre-wrap bg-[#080d1a] rounded-xl p-4 border border-white/5">
                {problem.constraints}
              </div>
            </div>
          )}

          {/* Example Test Cases */}
          {exampleTestCases && exampleTestCases.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
                Examples
              </h2>
              {exampleTestCases.map((tc, i) => (
                <div
                  key={tc.id}
                  className="rounded-2xl border border-white/10 bg-[#0b0f1e]/80 backdrop-blur p-6"
                >
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">
                    Example {i + 1}
                  </h3>

                  <div className="space-y-3">
                    {/* Input */}
                    <div>
                      <span className="text-xs font-semibold text-slate-400 mb-1 block">
                        Input:
                      </span>
                      <div className="bg-[#080d1a] rounded-xl p-3 border border-white/5 font-mono text-sm text-emerald-300 whitespace-pre-wrap">
                        {tc.input}
                      </div>
                    </div>

                    {/* Output */}
                    <div>
                      <span className="text-xs font-semibold text-slate-400 mb-1 block">
                        Output:
                      </span>
                      <div className="bg-[#080d1a] rounded-xl p-3 border border-white/5 font-mono text-sm text-blue-300 whitespace-pre-wrap">
                        {tc.output}
                      </div>
                    </div>

                    {/* Explanation */}
                    {tc.explanation && (
                      <div>
                        <span className="text-xs font-semibold text-slate-400 mb-1 block">
                          Explanation:
                        </span>
                        <div className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
                          {tc.explanation}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
