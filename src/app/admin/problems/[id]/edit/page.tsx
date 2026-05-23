import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import { redirect, notFound } from "next/navigation";
import ProblemForm from "../../components/ProblemForm";

export const metadata = {
  title: "Edit Problem — CodeStake",
  description: "Edit a coding problem",
};

export default async function EditProblemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
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

  // Fetch problem
  const { data: problem } = await supabase
    .from("problems")
    .select("id, title, description, constraints, difficulty, topics, is_published")
    .eq("id", id)
    .single();

  if (!problem) notFound();

  // Fetch example test cases
  const { data: exampleTestCases } = await supabase
    .from("example_test_cases")
    .select("id, input, output, explanation, sort_order")
    .eq("problem_id", id)
    .order("sort_order", { ascending: true });

  // Fetch hidden test cases
  const { data: hiddenTestCases } = await supabase
    .from("hidden_test_cases")
    .select("id, input, output, sort_order")
    .eq("problem_id", id)
    .order("sort_order", { ascending: true });

  return (
    <ProblemForm
      mode="edit"
      initialData={{
        id: problem.id,
        title: problem.title,
        description: problem.description,
        constraints: problem.constraints ?? "",
        difficulty: problem.difficulty as "Easy" | "Medium" | "Hard",
        topics: (problem.topics as string[]) ?? [],
        isPublished: problem.is_published,
        exampleTestCases:
          exampleTestCases?.map((tc) => ({
            id: tc.id,
            input: tc.input,
            output: tc.output,
            explanation: tc.explanation ?? "",
          })) ?? [],
        hiddenTestCases:
          hiddenTestCases?.map((tc) => ({
            id: tc.id,
            input: tc.input,
            output: tc.output,
          })) ?? [],
      }}
    />
  );
}
