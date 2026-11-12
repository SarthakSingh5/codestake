import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import { redirect } from "next/navigation";
import Link from "next/link";
import { deleteProblem, togglePublish } from "./actions";

export const metadata = {
  title: "Manage Problems — CodeStake",
  description: "Admin problem management dashboard",
};

// ── Difficulty badge styles ──────────────────────────────────────────────────
const difficultyStyles: Record<string, string> = {
  Easy: "bg-[#00ff66] text-black border border-black shadow-[1px_1px_0_0_#000]",
  Medium: "bg-[#ffcc00] text-black border border-black shadow-[1px_1px_0_0_#000]",
  Hard: "bg-[#ff3333] text-white border border-black shadow-[1px_1px_0_0_#000]",
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

  // Fetch all problems (admin sees drafts too, excluding auto-imported external entries)
  const { data: problems } = await supabase
    .from("problems")
    .select("id, title, slug, difficulty, topics, is_published, created_at")
    .not("description", "ilike", "%External problem imported%")
    .order("created_at", { ascending: true });

  return (
    <div className="min-h-screen bg-[#f4f4f0] text-black font-sans pb-16">
      {/* Top Banner */}
      <div className="bg-[#ffcc00] border-b-4 border-black px-4 py-2 flex items-center justify-between text-xs font-black uppercase tracking-widest">
        <div className="flex items-center gap-2">
          <Link href="/admin" className="hover:underline flex items-center gap-1 font-black">
            ← Back to HQ Dashboard
          </Link>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/problems" className="hover:underline flex items-center gap-1 font-black">
            Arena ↗
          </Link>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <div className="inline-block bg-[#00ff66] border-2 border-black px-3 py-0.5 text-xs font-black uppercase tracking-widest shadow-[2px_2px_0_0_#000] mb-2">
              Arena Catalog
            </div>
            <h1 className="text-3xl sm:text-4xl font-black uppercase tracking-tight text-black">
              Manage Problems
            </h1>
            <p className="mt-1 text-sm text-gray-700 font-bold">
              {problems?.length ?? 0} algorithmic challenge{(problems?.length ?? 0) !== 1 ? "s" : ""} registered in the armory
            </p>
          </div>

          <Link
            href="/admin/problems/create"
            className="nb-btn nb-btn-primary px-5 py-2.5 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-[4px_4px_0_0_#000]"
          >
            <span>+ Create New Problem</span>
          </Link>
        </div>

        {/* Problem list */}
        {!problems || problems.length === 0 ? (
          <div className="nb-box p-12 bg-white border-4 border-black text-center shadow-[8px_8px_0_0_#000]">
            <span className="text-3xl mb-3 block">📝</span>
            <h3 className="text-xl font-black uppercase text-black">No problems yet</h3>
            <p className="mt-2 text-xs font-bold text-gray-600 max-w-sm mx-auto uppercase">
              Create your first coding problem to activate the arena.
            </p>
            <Link
              href="/admin/problems/create"
              className="mt-6 inline-block nb-btn nb-btn-primary px-6 py-3 text-xs font-black uppercase tracking-wider"
            >
              Create Problem
            </Link>
          </div>
        ) : (
          <div className="nb-box bg-white border-4 border-black shadow-[8px_8px_0_0_#000] overflow-hidden">
            {/* Table header */}
            <div className="hidden md:grid grid-cols-[1fr_120px_1fr_120px_160px] gap-4 px-6 py-3.5 bg-black text-white text-xs font-black uppercase tracking-wider border-b-4 border-black">
              <span>Title</span>
              <span>Difficulty</span>
              <span>Topics</span>
              <span>Status</span>
              <span className="text-right">Actions</span>
            </div>

            {/* Rows */}
            <div className="divide-y-2 divide-black">
              {problems.map((problem) => (
                <div
                  key={problem.id}
                  className="grid grid-cols-1 md:grid-cols-[1fr_120px_1fr_120px_160px] gap-3 md:gap-4 px-6 py-4 hover:bg-gray-50 transition-colors items-center font-bold text-xs"
                >
                  {/* Title */}
                  <div>
                    <Link
                      href={`/admin/problems/${problem.id}/edit`}
                      className="font-black text-black hover:text-[#00a843] transition uppercase text-sm block"
                    >
                      {problem.title}
                    </Link>
                    <span className="font-mono text-[10px] text-gray-500">{problem.slug}</span>
                  </div>

                  {/* Difficulty */}
                  <div>
                    <span
                      className={`inline-block px-2 py-0.5 text-[10px] font-black uppercase ${
                        difficultyStyles[problem.difficulty] ?? "bg-gray-100 text-black border border-black"
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
                        className="bg-gray-100 px-2 py-0.5 text-[10px] font-black uppercase text-gray-700 border border-black"
                      >
                        {topic}
                      </span>
                    ))}
                    {(!problem.topics || (problem.topics as string[]).length === 0) && (
                      <span className="text-gray-400 font-mono">—</span>
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
                        className={`inline-block px-2.5 py-1 text-[10px] font-black uppercase border border-black shadow-[1px_1px_0_0_#000] transition hover:translate-x-[1px] hover:translate-y-[1px] ${
                          problem.is_published
                            ? "bg-[#00ff66] text-black"
                            : "bg-gray-200 text-gray-700"
                        }`}
                        title={problem.is_published ? "Click to unpublish" : "Click to publish"}
                      >
                        {problem.is_published ? "✓ Published" : "Draft"}
                      </button>
                    </form>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-2">
                    <Link
                      href={`/admin/problems/${problem.id}/edit`}
                      className="px-3 py-1 text-[10px] font-black uppercase bg-white text-black border border-black hover:bg-gray-100 shadow-[1px_1px_0_0_#000]"
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
                        className="px-3 py-1 text-[10px] font-black uppercase bg-[#ff3333] text-white border border-black hover:bg-red-600 shadow-[1px_1px_0_0_#000]"
                      >
                        Delete
                      </button>
                    </form>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
