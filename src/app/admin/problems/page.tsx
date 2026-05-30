import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import { redirect } from "next/navigation";
import Link from "next/link";
import { deleteProblem, togglePublish } from "./actions";

export const metadata = {
  title: "Manage Problems — CodeStake",
  description: "Admin problem management dashboard",
};

// ── Difficulty badge colors ──────────────────────────────────────────────────
const difficultyStyles: Record<string, string> = {
  Easy: "bg-emerald-500/15 text-emerald-300 ring-emerald-400/20",
  Medium: "bg-amber-500/15 text-amber-300 ring-amber-400/20",
  Hard: "bg-red-500/15 text-red-300 ring-red-400/20",
};

export default async function AdminProblemsPage() {
  const supabase = await createSupabaseServerClient();

  // Verify admin
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") redirect("/");

  // Fetch all problems (admin sees drafts too)
  const { data: problems } = await supabase
    .from("problems")
    .select("id, title, slug, difficulty, topics, is_published, created_at")
    .order("created_at", { ascending: true });

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#02050b] via-[#050c1d] to-[#071426] text-slate-100">
      {/* Ambient glow */}
      <div
        className="pointer-events-none fixed -top-32 left-1/2 -translate-x-1/2 h-96 w-96 rounded-full blur-3xl opacity-20"
        style={{ background: "radial-gradient(circle, #6366f1 0%, transparent 70%)" }}
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-6xl px-6 py-12">
        {/* Header */}
        <div className="mb-4">
          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-indigo-300 transition mb-4"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Admin Panel
          </Link>
        </div>

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white">Problems</h1>
            <p className="mt-1 text-sm text-slate-400">
              {problems?.length ?? 0} problem{(problems?.length ?? 0) !== 1 ? "s" : ""} total
            </p>
          </div>
          <Link
            href="/admin/problems/create"
            className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-900/40 transition hover:bg-indigo-500 active:scale-[0.98]"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            New Problem
          </Link>
        </div>

        {/* Problem list */}
        {!problems || problems.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-[#0b0f1e]/80 p-12 backdrop-blur flex flex-col items-center justify-center text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/5 ring-1 ring-white/10">
              <span className="text-2xl">📝</span>
            </div>
            <h3 className="text-lg font-medium text-white">No problems yet</h3>
            <p className="mt-2 text-sm text-slate-400 max-w-sm">
              Create your first coding problem to get started.
            </p>
            <Link
              href="/admin/problems/create"
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-900/40 transition hover:bg-indigo-500"
            >
              Create Problem
            </Link>
          </div>
        ) : (
          <div className="rounded-2xl border border-white/10 bg-[#0b0f1e]/80 backdrop-blur overflow-hidden">
            {/* Table header */}
            <div className="hidden md:grid grid-cols-[1fr_100px_1fr_100px_140px] gap-4 px-6 py-3 border-b border-white/5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <span>Title</span>
              <span>Difficulty</span>
              <span>Topics</span>
              <span>Status</span>
              <span className="text-right">Actions</span>
            </div>

            {/* Rows */}
            {problems.map((problem) => (
              <div
                key={problem.id}
                className="grid grid-cols-1 md:grid-cols-[1fr_100px_1fr_100px_140px] gap-3 md:gap-4 px-6 py-4 border-b border-white/5 last:border-b-0 hover:bg-white/[0.02] transition items-center"
              >
                {/* Title */}
                <div>
                  <Link
                    href={`/admin/problems/${problem.id}/edit`}
                    className="text-sm font-medium text-white hover:text-indigo-300 transition"
                  >
                    {problem.title}
                  </Link>
                </div>

                {/* Difficulty */}
                <div>
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${
                      difficultyStyles[problem.difficulty] ?? ""
                    }`}
                  >
                    {problem.difficulty}
                  </span>
                </div>

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
                  {(!problem.topics || (problem.topics as string[]).length === 0) && (
                    <span className="text-xs text-slate-600">—</span>
                  )}
                </div>

                {/* Status */}
                <div>
                  <form
                    action={async () => {
                      "use server";
                      const { togglePublish: toggle } = await import("./actions");
                      await toggle(problem.id, !problem.is_published);
                    }}
                  >
                    <button
                      type="submit"
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 transition hover:opacity-80 ${
                        problem.is_published
                          ? "bg-emerald-500/15 text-emerald-300 ring-emerald-400/20"
                          : "bg-slate-500/15 text-slate-400 ring-slate-400/20"
                      }`}
                      title={problem.is_published ? "Click to unpublish" : "Click to publish"}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          problem.is_published ? "bg-emerald-400" : "bg-slate-500"
                        }`}
                      />
                      {problem.is_published ? "Published" : "Draft"}
                    </button>
                  </form>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-2">
                  <Link
                    href={`/admin/problems/${problem.id}/edit`}
                    className="rounded-lg bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-300 ring-1 ring-white/10 transition hover:bg-white/10 hover:text-white"
                  >
                    Edit
                  </Link>
                  <form
                    action={async () => {
                      "use server";
                      const { deleteProblem: del } = await import("./actions");
                      await del(problem.id);
                    }}
                  >
                    <button
                      type="submit"
                      className="rounded-lg bg-white/5 px-3 py-1.5 text-xs font-medium text-red-400 ring-1 ring-white/10 transition hover:bg-red-500/20 hover:text-red-300 hover:ring-red-400/30"
                    >
                      Delete
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
