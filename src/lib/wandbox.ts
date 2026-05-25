// ── Wandbox API Client ───────────────────────────────────────────────────────
// This module handles communication with the Wandbox code execution API.
// Wandbox is a free, open-source online compiler.
//
// API Docs: https://github.com/melpon/wandbox/tree/master/kennel

const WANDBOX_API_URL = "https://wandbox.org/api/compile.json";

// ── Types ────────────────────────────────────────────────────────────────────
export type WandboxSubmission = {
  status: string; // "0" for success, "1" or others for errors
  signal: string;
  compiler_output: string;
  compiler_error: string;
  compiler_message: string;
  program_output: string;
  program_error: string;
  program_message: string;
};

export type TestCase = {
  input: string;
  output: string;
};

export type TestCaseResult = {
  index: number;
  passed: boolean;
  input: string;
  expectedOutput: string;
  actualOutput: string;
  stderr: string | null;
  time: string | null;
  memory: number | null;
  status: string;
};

// ── Execute a single piece of code ───────────────────────────────────────────
export async function executeCode(
  sourceCode: string,
  wandboxCompiler: string,
  stdin: string
): Promise<WandboxSubmission> {
  const body: Record<string, string> = {
    compiler: wandboxCompiler,
    code: sourceCode,
    stdin: stdin,
  };

  // Add C++17 option if it's the GCC compiler
  if (wandboxCompiler.includes("gcc")) {
    body.options = "c++17";
  }

  const response = await fetch(WANDBOX_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Wandbox API error (${response.status}): ${errorText}`);
  }

  return response.json();
}

// ── Execute code against multiple test cases ─────────────────────────────────
export async function executeTestSuite(
  sourceCode: string,
  wandboxCompiler: string,
  testCases: TestCase[]
): Promise<{
  verdict: string;
  results: TestCaseResult[];
  totalTime: number | null;
  totalMemory: number | null;
}> {
  const results: TestCaseResult[] = [];
  let allPassed = true;
  let overallVerdict = "accepted";

  // Run each test case sequentially
  for (let i = 0; i < testCases.length; i++) {
    const tc = testCases[i];

    try {
      const submission = await executeCode(sourceCode, wandboxCompiler, tc.input);

      // Check for compilation errors
      if (submission.compiler_error && submission.compiler_error.length > 0 && !submission.program_message) {
        // Sometimes warnings go to compiler_error but code still runs.
        // If we have a compiler error and no program message, it likely failed to compile.
        // Wait, Wandbox sets status != "0" on compile error too.
      }

      if (submission.status !== "0" && !submission.program_output && !submission.program_error) {
         // This is a compilation error
         results.push({
          index: i,
          passed: false,
          input: tc.input,
          expectedOutput: tc.output,
          actualOutput: "",
          stderr: submission.compiler_error || submission.compiler_message,
          time: null,
          memory: null,
          status: "compilation_error",
        });
        allPassed = false;
        overallVerdict = "compilation_error";
        break; // Stop running further test cases
      }

      // Check runtime errors (status != "0" but program ran)
      if (submission.status !== "0") {
        results.push({
          index: i,
          passed: false,
          input: tc.input,
          expectedOutput: tc.output,
          actualOutput: submission.program_output,
          stderr: submission.program_error || submission.program_message,
          time: null,
          memory: null,
          status: "runtime_error",
        });
        allPassed = false;
        if (overallVerdict === "accepted") overallVerdict = "runtime_error";
        continue;
      }

      // Compare output
      const actualOutput = (submission.program_output ?? "").trim();
      const expectedOutput = tc.output.trim();
      const passed = actualOutput === expectedOutput;

      if (!passed) allPassed = false;

      let status = passed ? "accepted" : "wrong_answer";
      if (!passed && overallVerdict === "accepted") overallVerdict = "wrong_answer";

      results.push({
        index: i,
        passed,
        input: tc.input,
        expectedOutput: tc.output,
        actualOutput: submission.program_output ?? "",
        stderr: submission.program_error || null,
        time: null,   // Wandbox API doesn't return execution time directly in the standard response
        memory: null, // Wandbox API doesn't return memory usage directly
        status,
      });

    } catch (error) {
      results.push({
        index: i,
        passed: false,
        input: tc.input,
        expectedOutput: tc.output,
        actualOutput: "",
        stderr: error instanceof Error ? error.message : "Unknown error",
        time: null,
        memory: null,
        status: "runtime_error",
      });
      allPassed = false;
      if (overallVerdict === "accepted") overallVerdict = "runtime_error";
    }
  }

  return {
    verdict: allPassed ? "accepted" : overallVerdict,
    results,
    totalTime: null,
    totalMemory: null,
  };
}
