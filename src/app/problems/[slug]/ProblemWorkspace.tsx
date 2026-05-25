"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import CodeEditor from "./CodeEditor";
import { LANGUAGES, getDefaultLanguage } from "@/lib/languages";

// ── Types ────────────────────────────────────────────────────────────────────
type ExampleTestCase = {
  id: string;
  input: string;
  output: string;
  explanation: string | null;
  sort_order: number;
};

type Problem = {
  id: string;
  title: string;
  slug: string;
  description: string;
  constraints: string | null;
  difficulty: string;
  topics: string[];
};

type TestCaseResult = {
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

type ExecutionResult = {
  verdict: string;
  results: TestCaseResult[];
  totalTime: number | null;
  totalMemory: number | null;
};

type Submission = {
  id: string;
  language: string;
  status: string;
  runtime_ms: number | null;
  memory_kb: number | null;
  created_at: string;
};

type ProblemWorkspaceProps = {
  problem: Problem;
  exampleTestCases: ExampleTestCase[];
};

// ── Difficulty badge colors ──────────────────────────────────────────────────
const difficultyStyles: Record<string, string> = {
  Easy: "bg-emerald-500/15 text-emerald-300 ring-emerald-400/20",
  Medium: "bg-amber-500/15 text-amber-300 ring-amber-400/20",
  Hard: "bg-red-500/15 text-red-300 ring-red-400/20",
};

// ── Main Component ───────────────────────────────────────────────────────────
export default function ProblemWorkspace({
  problem,
  exampleTestCases,
}: ProblemWorkspaceProps) {
  // ── State ──────────────────────────────────────────────────────────────────
  const defaultLang = getDefaultLanguage();
  const [selectedLanguage, setSelectedLanguage] = useState(defaultLang.id);
  const [code, setCode] = useState(defaultLang.boilerplate);
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<ExecutionResult | null>(null);
  const [activeTab, setActiveTab] = useState<"description" | "submissions">("description");
  const [resultsPanelOpen, setResultsPanelOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [isLoadingSubmissions, setIsLoadingSubmissions] = useState(false);

  // ── Fetch Submissions ──────────────────────────────────────────────────────
  async function fetchSubmissions() {
    setIsLoadingSubmissions(true);
    try {
      const res = await fetch(`/api/submissions?problemId=${problem.id}`);
      if (res.ok) {
        const data = await res.json();
        setSubmissions(data.submissions || []);
      }
    } catch (e) {
      console.error("Failed to fetch submissions", e);
    } finally {
      setIsLoadingSubmissions(false);
    }
  }

  // Fetch submissions on component mount
  useEffect(() => {
    fetchSubmissions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [problem.id]);

  // ── Language switch handler ────────────────────────────────────────────────
  // When the user switches language, we swap the boilerplate code
  function handleLanguageChange(langId: string) {
    const lang = LANGUAGES.find((l) => l.id === langId);
    if (lang) {
      setSelectedLanguage(langId);
      setCode(lang.boilerplate);
    }
  }

  // ── Get current Monaco language identifier ─────────────────────────────────
  const currentLang = LANGUAGES.find((l) => l.id === selectedLanguage)!;

  // ── Run code (example test cases only) ─────────────────────────────────────
  async function handleRun() {
    setIsRunning(true);
    setError(null);
    setResult(null);
    setResultsPanelOpen(true);

    try {
      const res = await fetch("/api/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          problemId: problem.id,
          language: selectedLanguage,
          code,
          mode: "run",
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Execution failed");
        return;
      }

      const data: ExecutionResult = await res.json();
      console.log("Run data:", data);
      setResult(data);
    } catch (e) {
      console.error(e);
      setError("Network error — could not reach the server");
    } finally {
      setIsRunning(false);
    }
  }

  // ── Submit code (all test cases) ───────────────────────────────────────────
  async function handleSubmit() {
    setIsSubmitting(true);
    setError(null);
    setResult(null);
    setResultsPanelOpen(true);

    try {
      const res = await fetch("/api/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          problemId: problem.id,
          language: selectedLanguage,
          code,
          mode: "submit",
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Submission failed");
        return;
      }

      const data: ExecutionResult = await res.json();
      console.log("Submit data:", data);
      setResult(data);
      // Auto-refresh submissions list so the new one appears immediately
      fetchSubmissions();
    } catch (e) {
      console.error(e);
      setError("Network error — could not reach the server");
    } finally {
      setIsSubmitting(false);
    }
  }

  // ── Verdict badge styling ──────────────────────────────────────────────────
  function verdictStyle(verdict: string): string {
    switch (verdict) {
      case "accepted":
        return "bg-emerald-500/15 text-emerald-300 ring-emerald-400/20";
      case "wrong_answer":
        return "bg-red-500/15 text-red-300 ring-red-400/20";
      case "time_limit":
        return "bg-amber-500/15 text-amber-300 ring-amber-400/20";
      case "runtime_error":
      case "compilation_error":
        return "bg-red-500/15 text-red-300 ring-red-400/20";
      default:
        return "bg-slate-500/15 text-slate-300 ring-slate-400/20";
    }
  }

  function verdictLabel(verdict: string): string {
    switch (verdict) {
      case "accepted": return "Accepted ✅";
      case "wrong_answer": return "Wrong Answer ❌";
      case "time_limit": return "Time Limit Exceeded ⏱️";
      case "runtime_error": return "Runtime Error 💥";
      case "compilation_error": return "Compilation Error 🔧";
      default: return verdict;
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-1 overflow-hidden">
      {/* ────────────────────── LEFT PANEL: Problem Description ────────────── */}
      <div className="w-[45%] min-w-[320px] border-r border-white/10 flex flex-col overflow-hidden">
        {/* Tabs */}
        <div className="flex items-center border-b border-white/10 bg-[#0b0f1e]/80">
          <button
            onClick={() => setActiveTab("description")}
            className={`px-4 py-2.5 text-sm font-medium transition ${activeTab === "description"
                ? "text-white border-b-2 border-indigo-400"
                : "text-slate-400 hover:text-slate-200"
              }`}
          >
            Description
          </button>
          <button
            onClick={() => setActiveTab("submissions")}
            className={`px-4 py-2.5 text-sm font-medium transition ${activeTab === "submissions"
                ? "text-white border-b-2 border-indigo-400"
                : "text-slate-400 hover:text-slate-200"
              }`}
          >
            Submissions
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {activeTab === "description" ? (
            <>
              {/* Back link */}
              <Link
                href="/problems"
                className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-indigo-300 transition"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
                All Problems
              </Link>

              {/* Header */}
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${difficultyStyles[problem.difficulty] ?? ""
                      }`}
                  >
                    {problem.difficulty}
                  </span>
                  {problem.topics?.map((topic: string) => (
                    <span
                      key={topic}
                      className="rounded-full bg-indigo-500/10 px-2 py-0.5 text-xs font-medium text-indigo-300 ring-1 ring-indigo-400/20"
                    >
                      {topic}
                    </span>
                  ))}
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-white">
                  {problem.title}
                </h1>
              </div>

              {/* Description */}
              <div className="rounded-xl border border-white/10 bg-[#080d1a]/60 p-4">
                <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                  Description
                </h2>
                <div className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">
                  {problem.description}
                </div>
              </div>

              {/* Constraints */}
              {problem.constraints && (
                <div className="rounded-xl border border-white/10 bg-[#080d1a]/60 p-4">
                  <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                    Constraints
                  </h2>
                  <div className="text-sm text-slate-300 font-mono leading-relaxed whitespace-pre-wrap bg-[#060a16] rounded-lg p-3 border border-white/5">
                    {problem.constraints}
                  </div>
                </div>
              )}

              {/* Example Test Cases */}
              {exampleTestCases.length > 0 && (
                <div className="space-y-3">
                  <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Examples
                  </h2>
                  {exampleTestCases.map((tc, i) => (
                    <div
                      key={tc.id}
                      className="rounded-xl border border-white/10 bg-[#080d1a]/60 p-4 space-y-2"
                    >
                      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Example {i + 1}
                      </h3>
                      <div>
                        <span className="text-xs font-semibold text-slate-400 mb-1 block">Input:</span>
                        <div className="bg-[#060a16] rounded-lg p-2.5 border border-white/5 font-mono text-sm text-emerald-300 whitespace-pre-wrap">
                          {tc.input}
                        </div>
                      </div>
                      <div>
                        <span className="text-xs font-semibold text-slate-400 mb-1 block">Output:</span>
                        <div className="bg-[#060a16] rounded-lg p-2.5 border border-white/5 font-mono text-sm text-blue-300 whitespace-pre-wrap">
                          {tc.output}
                        </div>
                      </div>
                      {tc.explanation && (
                        <div>
                          <span className="text-xs font-semibold text-slate-400 mb-1 block">Explanation:</span>
                          <div className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
                            {tc.explanation}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            /* Submissions tab */
            <div className="space-y-4">
              <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">
                Past Submissions
              </h2>
              
              {isLoadingSubmissions ? (
                <div className="flex justify-center py-8">
                  <span className="h-5 w-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : submissions.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-slate-500">
                  <svg className="w-12 h-12 mb-3 text-slate-600/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-sm">No submissions yet.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {submissions.map((sub) => {
                    const lang = LANGUAGES.find((l) => l.id === sub.language);
                    const isAccepted = sub.status === "accepted";
                    return (
                      <div
                        key={sub.id}
                        className="flex flex-col rounded-xl border border-white/10 bg-[#080d1a]/60 p-4 transition hover:bg-white/[0.02]"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${verdictStyle(sub.status)}`}
                          >
                            {verdictLabel(sub.status)}
                          </span>
                          <span className="text-xs text-slate-500">
                            {new Date(sub.created_at).toLocaleDateString()} {new Date(sub.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-slate-400">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-slate-600"></span>
                            {lang ? lang.label : sub.language}
                          </span>
                          {/* We don't have accurate time/memory from Wandbox, but if we did, they'd show here */}
                          {sub.runtime_ms !== null && <span>⏱️ {sub.runtime_ms}ms</span>}
                          {sub.memory_kb !== null && <span>💾 {(sub.memory_kb / 1024).toFixed(1)}MB</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ────────────────────── RIGHT PANEL: Editor + Results ─────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Toolbar: Language selector + Run/Submit buttons */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-white/10 bg-[#0b0f1e]/80">
          {/* Language picker */}
          <select
            id="language-select"
            value={selectedLanguage}
            onChange={(e) => handleLanguageChange(e.target.value)}
            className="rounded-lg border border-white/10 bg-[#080d1a] px-3 py-1.5 text-sm text-white focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/25 transition cursor-pointer"
          >
            {LANGUAGES.map((lang) => (
              <option key={lang.id} value={lang.id}>
                {lang.label}
              </option>
            ))}
          </select>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button
              id="btn-run"
              onClick={handleRun}
              disabled={isRunning || isSubmitting}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-4 py-1.5 text-sm font-medium text-slate-200 transition hover:bg-white/10 hover:text-white active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isRunning ? (
                <>
                  <span className="h-3.5 w-3.5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                  Running…
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Run
                </>
              )}
            </button>
            <button
              id="btn-submit"
              onClick={handleSubmit}
              disabled={isRunning || isSubmitting}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-1.5 text-sm font-semibold text-white shadow-lg shadow-emerald-900/30 transition hover:bg-emerald-500 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <span className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Submitting…
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  Submit
                </>
              )}
            </button>
          </div>
        </div>

        {/* Monaco Editor */}
        <div className="flex-1 overflow-hidden">
          <CodeEditor
            language={currentLang.monacoLang}
            value={code}
            onChange={setCode}
          />
        </div>

        {/* ────────── Results Panel (collapsible) ────────── */}
        {resultsPanelOpen && (
          <div className="border-t border-white/10 bg-[#080d1a]/90 max-h-[40%] overflow-y-auto">
            {/* Panel header */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-white/5">
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Results
                </span>
                {result && (
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${verdictStyle(result.verdict)}`}
                  >
                    {verdictLabel(result.verdict)}
                  </span>
                )}
              </div>
              <button
                onClick={() => setResultsPanelOpen(false)}
                className="text-slate-500 hover:text-white transition text-lg leading-none"
                aria-label="Close results"
              >
                ×
              </button>
            </div>

            {/* Error message */}
            {error && (
              <div className="mx-4 mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                {error}
              </div>
            )}

            {/* Loading state */}
            {(isRunning || isSubmitting) && !result && (
              <div className="flex items-center justify-center py-8 text-slate-400 text-sm gap-2">
                <span className="h-4 w-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                {isRunning ? "Running against test cases…" : "Submitting…"}
              </div>
            )}

            {/* Test case results */}
            {result && (
              <div className="p-3 space-y-2">
                {result.results.map((tc) => (
                  <details
                    key={tc.index}
                    className="rounded-lg border border-white/5 bg-[#060a16]/60 overflow-hidden group"
                  >
                    <summary className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-white/[0.02] transition">
                      <div className="flex items-center gap-2">
                        <span className={tc.passed ? "text-emerald-400" : "text-red-400"}>
                          {tc.passed ? "✅" : "❌"}
                        </span>
                        <span className="text-sm text-slate-300">
                          Test Case {tc.index + 1}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-500">
                        {tc.time && <span>{tc.time}s</span>}
                        {tc.memory && <span>{(tc.memory / 1024).toFixed(1)} MB</span>}
                        <span className="text-[10px]">▼</span>
                      </div>
                    </summary>
                    <div className="px-3 pb-3 space-y-2 border-t border-white/5 pt-2">
                      <div>
                        <span className="text-xs font-semibold text-slate-500 block mb-1">Input:</span>
                        <pre className="bg-[#040810] rounded p-2 text-xs font-mono text-slate-300 whitespace-pre-wrap">
                          {tc.input}
                        </pre>
                      </div>
                      <div>
                        <span className="text-xs font-semibold text-slate-500 block mb-1">Expected:</span>
                        <pre className="bg-[#040810] rounded p-2 text-xs font-mono text-emerald-300 whitespace-pre-wrap">
                          {tc.expectedOutput}
                        </pre>
                      </div>
                      <div>
                        <span className="text-xs font-semibold text-slate-500 block mb-1">Your Output:</span>
                        <pre className={`bg-[#040810] rounded p-2 text-xs font-mono whitespace-pre-wrap ${tc.passed ? "text-emerald-300" : "text-red-300"
                          }`}>
                          {tc.actualOutput || "(no output)"}
                        </pre>
                      </div>
                      {tc.stderr && (
                        <div>
                          <span className="text-xs font-semibold text-red-400 block mb-1">Stderr:</span>
                          <pre className="bg-[#040810] rounded p-2 text-xs font-mono text-red-300 whitespace-pre-wrap">
                            {tc.stderr}
                          </pre>
                        </div>
                      )}
                    </div>
                  </details>
                ))}

                {/* Summary */}
                {result.totalTime !== null && (
                  <div className="flex items-center gap-4 pt-2 text-xs text-slate-500">
                    <span>Total: {result.totalTime}ms</span>
                    {result.totalMemory && (
                      <span>Memory: {(result.totalMemory / 1024).toFixed(1)} MB</span>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
