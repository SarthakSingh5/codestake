"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

// ── Types ────────────────────────────────────────────────────────────────────
export type ExampleTestCaseInput = {
  id?: string;
  input: string;
  output: string;
  explanation?: string;
};

export type HiddenTestCaseInput = {
  id?: string;
  input: string;
  output: string;
};

export type ProblemFormData = {
  title: string;
  description: string;
  constraints: string;
  difficulty: "Easy" | "Medium" | "Hard";
  topics: string[];
  exampleTestCases: ExampleTestCaseInput[];
  hiddenTestCases: HiddenTestCaseInput[];
  isPublished: boolean;
};

// ── Helpers ──────────────────────────────────────────────────────────────────
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

async function verifyAdmin() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") throw new Error("Not authorized");

  return { supabase, user };
}

// ── Create Problem ──────────────────────────────────────────────────────────
export async function createProblem(
  data: ProblemFormData
): Promise<{ error: string } | undefined> {
  const { supabase } = await verifyAdmin();

  // Validate required fields
  if (!data.title.trim()) return { error: "Title is required" };
  if (!data.description.trim()) return { error: "Description is required" };

  // Generate unique slug
  let slug = generateSlug(data.title);
  if (!slug) slug = `problem-${Date.now()}`;

  const { data: existing } = await supabase
    .from("problems")
    .select("slug")
    .eq("slug", slug);

  if (existing && existing.length > 0) {
    slug = `${slug}-${Date.now()}`;
  }

  // Insert problem
  const { data: problem, error } = await supabase
    .from("problems")
    .insert({
      title: data.title.trim(),
      slug,
      description: data.description.trim(),
      constraints: data.constraints.trim() || null,
      difficulty: data.difficulty,
      topics: data.topics,
      is_published: data.isPublished,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  // Insert example test cases
  const validExamples = data.exampleTestCases.filter(
    (tc) => tc.input.trim() && tc.output.trim()
  );
  if (validExamples.length > 0) {
    const { error: etcError } = await supabase
      .from("example_test_cases")
      .insert(
        validExamples.map((tc, i) => ({
          problem_id: problem.id,
          input: tc.input.trim(),
          output: tc.output.trim(),
          explanation: tc.explanation?.trim() || null,
          sort_order: i,
        }))
      );
    if (etcError) return { error: etcError.message };
  }

  // Insert hidden test cases
  const validHidden = data.hiddenTestCases.filter(
    (tc) => tc.input.trim() && tc.output.trim()
  );
  if (validHidden.length > 0) {
    const { error: htcError } = await supabase
      .from("hidden_test_cases")
      .insert(
        validHidden.map((tc, i) => ({
          problem_id: problem.id,
          input: tc.input.trim(),
          output: tc.output.trim(),
          sort_order: i,
        }))
      );
    if (htcError) return { error: htcError.message };
  }

  revalidatePath("/admin/problems");
  revalidatePath("/problems");
  redirect("/admin/problems");
}

// ── Update Problem ──────────────────────────────────────────────────────────
export async function updateProblem(
  problemId: string,
  data: ProblemFormData
): Promise<{ error: string } | undefined> {
  const { supabase } = await verifyAdmin();

  if (!data.title.trim()) return { error: "Title is required" };
  if (!data.description.trim()) return { error: "Description is required" };

  // Regenerate slug from title
  let slug = generateSlug(data.title);
  if (!slug) slug = `problem-${Date.now()}`;

  // Check uniqueness (exclude current problem)
  const { data: existing } = await supabase
    .from("problems")
    .select("slug, id")
    .eq("slug", slug)
    .neq("id", problemId);

  if (existing && existing.length > 0) {
    slug = `${slug}-${Date.now()}`;
  }

  // Update problem
  const { error } = await supabase
    .from("problems")
    .update({
      title: data.title.trim(),
      slug,
      description: data.description.trim(),
      constraints: data.constraints.trim() || null,
      difficulty: data.difficulty,
      topics: data.topics,
      is_published: data.isPublished,
    })
    .eq("id", problemId);

  if (error) return { error: error.message };

  // Replace example test cases (delete all, re-insert)
  await supabase
    .from("example_test_cases")
    .delete()
    .eq("problem_id", problemId);

  const validExamples = data.exampleTestCases.filter(
    (tc) => tc.input.trim() && tc.output.trim()
  );
  if (validExamples.length > 0) {
    const { error: etcError } = await supabase
      .from("example_test_cases")
      .insert(
        validExamples.map((tc, i) => ({
          problem_id: problemId,
          input: tc.input.trim(),
          output: tc.output.trim(),
          explanation: tc.explanation?.trim() || null,
          sort_order: i,
        }))
      );
    if (etcError) return { error: etcError.message };
  }

  // Replace hidden test cases
  await supabase
    .from("hidden_test_cases")
    .delete()
    .eq("problem_id", problemId);

  const validHidden = data.hiddenTestCases.filter(
    (tc) => tc.input.trim() && tc.output.trim()
  );
  if (validHidden.length > 0) {
    const { error: htcError } = await supabase
      .from("hidden_test_cases")
      .insert(
        validHidden.map((tc, i) => ({
          problem_id: problemId,
          input: tc.input.trim(),
          output: tc.output.trim(),
          sort_order: i,
        }))
      );
    if (htcError) return { error: htcError.message };
  }

  revalidatePath("/admin/problems");
  revalidatePath("/problems");
  revalidatePath(`/problems/${slug}`);
  redirect("/admin/problems");
}

// ── Delete Problem ──────────────────────────────────────────────────────────
export async function deleteProblem(
  problemId: string
): Promise<{ error: string } | undefined> {
  const { supabase } = await verifyAdmin();

  const { error } = await supabase
    .from("problems")
    .delete()
    .eq("id", problemId);

  if (error) return { error: error.message };

  revalidatePath("/admin/problems");
  revalidatePath("/problems");
  return undefined;
}

// ── Toggle Publish ──────────────────────────────────────────────────────────
export async function togglePublish(
  problemId: string,
  isPublished: boolean
): Promise<{ error: string } | undefined> {
  const { supabase } = await verifyAdmin();

  const { error } = await supabase
    .from("problems")
    .update({ is_published: isPublished })
    .eq("id", problemId);

  if (error) return { error: error.message };

  revalidatePath("/admin/problems");
  revalidatePath("/problems");
  return undefined;
}
