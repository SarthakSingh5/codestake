// ── /api/execute — Code Execution API Route ─────────────────────────────────
//
// This is the server-side endpoint that:
//   1. Authenticates the user
//   2. Fetches test cases from Supabase
//   3. Sends code to Piston for execution
//   4. Compares output vs expected
//   5. Optionally saves the submission to the database
//
// POST body: { problemId, language, code, mode: "run" | "submit" }

import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import { getLanguageById } from "@/lib/languages";
import { executeTestSuite, type TestCase } from "@/lib/wandbox";

export async function POST(request: Request) {
  try {
    // ── 1. Parse request body ──────────────────────────────────────────────
    const body = await request.json();
    const { problemId, language, code, mode } = body as {
      problemId: string;
      language: string;
      code: string;
      mode: "run" | "submit";
    };

    // Validate
    if (!problemId || !language || !code || !mode) {
      return Response.json(
        { error: "Missing required fields: problemId, language, code, mode" },
        { status: 400 }
      );
    }

    if (mode !== "run" && mode !== "submit") {
      return Response.json(
        { error: "Mode must be 'run' or 'submit'" },
        { status: 400 }
      );
    }

    // ── 2. Verify the language is supported ────────────────────────────────
    const lang = getLanguageById(language);
    if (!lang) {
      return Response.json(
        { error: `Unsupported language: ${language}` },
        { status: 400 }
      );
    }

    // ── 3. Authenticate the user ───────────────────────────────────────────
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    // ── 4. Fetch test cases ────────────────────────────────────────────────
    // "run" mode  → example test cases only (visible to user)
    // "submit" mode → example + hidden test cases (full judge)

    const testCases: TestCase[] = [];

    // Always fetch example test cases
    const { data: exampleTCs } = await supabase
      .from("example_test_cases")
      .select("input, output")
      .eq("problem_id", problemId)
      .order("sort_order", { ascending: true });

    if (exampleTCs) {
      testCases.push(...exampleTCs.map((tc) => ({ input: tc.input, output: tc.output })));
    }

    // For "submit" mode, also fetch hidden test cases
    if (mode === "submit") {
      const { data: hiddenTCs } = await supabase
        .from("hidden_test_cases")
        .select("input, output")
        .eq("problem_id", problemId)
        .order("sort_order", { ascending: true });

      if (hiddenTCs) {
        testCases.push(...hiddenTCs.map((tc) => ({ input: tc.input, output: tc.output })));
      }
    }

    if (testCases.length === 0) {
      return Response.json(
        { error: "No test cases found for this problem" },
        { status: 404 }
      );
    }

    // ── 5. Execute the code against test cases (via Wandbox) ────────────────
    const result = await executeTestSuite(code, lang.wandboxCompiler, testCases);

    // ── 6. If "submit" mode, save to database and evaluate stakes ───────
    if (mode === "submit") {
      await supabase.from("submissions").insert({
        user_id: user.id,
        problem_id: problemId,
        language: language,
        code: code,
        status: result.verdict,
        results: result.results,
        runtime_ms: result.totalTime,
        memory_kb: result.totalMemory,
      });

      // STAKING LOGIC
      const { data: activeSession } = await supabase
        .from("stake_sessions")
        .select("id, expires_at, mode")
        .eq("user_id", user.id)
        .eq("problem_id", problemId)
        .eq("status", "active")
        .single();

      if (activeSession) {
        const { failStakeSession } = await import("@/app/actions/stake");
        const { internalResolveStakeWin } = await import("@/lib/internalStake");
        
        // 1. Did they run out of time?
        if (activeSession.expires_at && new Date(activeSession.expires_at) < new Date()) {
           await failStakeSession(activeSession.id);
           result.verdict = "time_limit"; // Force time limit response
        } 
        // 2. Did they win in time?
        else if (result.verdict === "accepted") {
           await internalResolveStakeWin(activeSession.id);
        }
        // 3. One Shot Mode Penalty: If they didn't win and they are in One Shot mode, they lose instantly.
        else if (activeSession.mode === "one_shot") {
           await failStakeSession(activeSession.id);
        }
        // If wrong answer in "time_crunch" but still has time, do nothing.
      }
    }

    // ── 7. Return results ──────────────────────────────────────────────────
    // IMPORTANT: For "submit" mode, we hide the input/expected output of hidden test cases
    // so users can't extract them from the response.
    if (mode === "submit" && exampleTCs) {
      const exampleCount = exampleTCs.length;
      result.results = result.results.map((r, i) => {
        if (i >= exampleCount) {
          // Hidden test case — redact the actual test data
          return {
            ...r,
            input: "(hidden)",
            expectedOutput: "(hidden)",
          };
        }
        return r;
      });
    }

    return Response.json(result);
  } catch (error) {
    console.error("Execute API error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
