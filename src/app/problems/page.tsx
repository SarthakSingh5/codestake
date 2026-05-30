import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import { redirect } from "next/navigation";
import Navbar from "../components/Navbar";
import ProblemsClient from "./ProblemsClient";

export const metadata = {
  title: "Problems — CodeStake",
  description: "Browse and solve coding problems.",
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
    .order("created_at", { ascending: true });

  // Fetch this user's submissions to determine status per problem
  const { data: submissions } = await supabase
    .from("submissions")
    .select("problem_id, status")
    .eq("user_id", user.id);

  // Build a status map: problemId -> "solved" | "attempted"
  const statusMap: Record<string, "solved" | "attempted"> = {};
  if (submissions) {
    for (const sub of submissions) {
      if (statusMap[sub.problem_id] === "solved") continue; // already solved
      if (sub.status === "accepted") {
        statusMap[sub.problem_id] = "solved";
      } else {
        statusMap[sub.problem_id] = "attempted";
      }
    }
  }

  // Collect all unique topics across all problems
  const allTopics = Array.from(
    new Set(
      (problems ?? []).flatMap((p) => (p.topics as string[]) ?? [])
    )
  ).sort();

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

          <ProblemsClient
            problems={problems ?? []}
            statusMap={statusMap}
            allTopics={allTopics}
          />
        </div>
      </main>
    </div>
  );
}
