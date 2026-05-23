import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import { redirect } from "next/navigation";
import Link from "next/link";
import Navbar from "../components/Navbar";

export const metadata = {
  title: "Problems — CodeStake",
  description: "Browse and solve coding problems.",
};

// ── Difficulty badge colors ──────────────────────────────────────────────────
const difficultyStyles: Record<string, string> = {
  Easy: "bg-emerald-500/15 text-emerald-300 ring-emerald-400/20",
  Medium: "bg-amber-500/15 text-amber-300 ring-amber-400/20",
  Hard: "bg-red-500/15 text-red-300 ring-red-400/20",
};

export default async function ProblemsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Protect the route
  if (!user) {
    redirect("/login");
  }

  // Fetch published problems
  const { data: problems } = await supabase
    .from("problems")
    .select("id, title, slug, difficulty, topics, created_at")
    .eq("is_published", true)
    .order("created_at", { ascending: false });

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

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 relative">
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight text-white">Problems</h1>
            <p className="mt-2 text-sm text-slate-400">
              Select a problem to start coding.
            </p>
          </div>

          {!problems || problems.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-[#0b0f1e]/80 p-12 backdrop-blur flex flex-col items-center justify-center text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/5 ring-1 ring-white/10">
                <span className="text-2xl">📝</span>
              </div>
              <h3 className="text-lg font-medium text-white">No problems available yet</h3>
              <p className="mt-2 text-sm text-slate-400 max-w-sm">
                We are currently preparing the problem set. Check back later to start your coding journey.
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-white/10 bg-[#0b0f1e]/80 backdrop-blur overflow-hidden">
              {/* Table header */}
              <div className="hidden md:grid grid-cols-[auto_1fr_100px_1fr] gap-4 px-6 py-3 border-b border-white/5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <span className="w-8">#</span>
                <span>Title</span>
                <span>Difficulty</span>
                <span>Topics</span>
              </div>

              {/* Rows */}
              {problems.map((problem, index) => (
                <Link
                  key={problem.id}
                  href={`/problems/${problem.slug}`}
                  className="grid grid-cols-1 md:grid-cols-[auto_1fr_100px_1fr] gap-3 md:gap-4 px-6 py-4 border-b border-white/5 last:border-b-0 hover:bg-white/[0.03] transition items-center group"
                >
                  {/* Number */}
                  <span className="hidden md:block w-8 text-sm text-slate-500 font-mono">
                    {index + 1}
                  </span>

                  {/* Title */}
                  <span className="text-sm font-medium text-white group-hover:text-indigo-300 transition">
                    {problem.title}
                  </span>

                  {/* Difficulty */}
                  <span
                    className={`inline-flex self-start md:self-center w-fit rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${
                      difficultyStyles[problem.difficulty] ?? ""
                    }`}
                  >
                    {problem.difficulty}
                  </span>

                  {/* Topics */}
                  <div className="flex flex-wrap gap-1">
                    {(problem.topics as string[])?.map((topic: string) => (
                      <span
                        key={topic}
                        className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-400"
                      >
                        {topic}
                      </span>
                    ))}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
