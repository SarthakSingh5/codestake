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
    <div className="min-h-screen flex flex-col font-sans">
      <Navbar />
      <main className="flex-1 relative">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 relative">
          <div className="mb-8 border-l-8 border-[#ff3333] pl-6 py-2 bg-white border-y-4 border-r-4 border-black shadow-[4px_4px_0_0_#000]">
            <h1 className="text-4xl font-black uppercase tracking-tighter text-black">Arena</h1>
            <p className="mt-2 text-sm text-black font-bold uppercase tracking-widest">
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
