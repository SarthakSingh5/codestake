"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  isHardcoreModeEnabled: boolean;
  walletBalance: number;
  initialActiveSession: any | null;
};

// ── Difficulty badge colors ──────────────────────────────────────────────────
const difficultyStyles: Record<string, string> = {
  Easy: "bg-[#00ff66] text-black border-2 border-black shadow-[2px_2px_0_0_#000]",
  Medium: "bg-[#ffcc00] text-black border-2 border-black shadow-[2px_2px_0_0_#000]",
  Hard: "bg-[#ff3333] text-white border-2 border-black shadow-[2px_2px_0_0_#000]",
};

import { createStakeSession, failStakeSession } from "@/app/actions/stake";

// ── Main Component ───────────────────────────────────────────────────────────
export default function ProblemWorkspace({
  problem,
  exampleTestCases,
  isHardcoreModeEnabled,
  walletBalance,
  initialActiveSession,
}: ProblemWorkspaceProps) {
  const router = useRouter();

  // ── State ──────────────────────────────────────────────────────────────────
  const defaultLang = getDefaultLanguage();
  const [selectedLanguage, setSelectedLanguage] = useState(defaultLang.id);
  const [code, setCode] = useState(defaultLang.boilerplate);
  const lastCodeLength = useRef(defaultLang.boilerplate.length);
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<ExecutionResult | null>(null);
  const [activeTab, setActiveTab] = useState<"description" | "submissions">("description");
  const [resultsPanelOpen, setResultsPanelOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [isLoadingSubmissions, setIsLoadingSubmissions] = useState(false);
  const [timeLeft, setTimeLeft] = useState<string>("");

  // ── Hardcore Staking State ─────────────────────────────────────────────────
  const [activeSession, setActiveSession] = useState<any | null>(initialActiveSession);
  const [showWagerModal, setShowWagerModal] = useState(isHardcoreModeEnabled && !initialActiveSession);
  const [stakeAmount, setStakeAmount] = useState<number>(500); // Default $5.00
  const [stakeMode, setStakeMode] = useState<string>("time_crunch");
  const [timerDuration, setTimerDuration] = useState<number>(30); // minutes
  const [isStaking, setIsStaking] = useState(false);
  const [stakeError, setStakeError] = useState<string | null>(null);
  // ── Live Countdown Timer ───────────────────────────────────────────────────
  useEffect(() => {
    if (!activeSession || activeSession.mode !== "time_crunch" || !activeSession.expires_at) return;

    const interval = setInterval(async () => {
      const now = new Date().getTime();
      const expiration = new Date(activeSession.expires_at!).getTime();
      const distance = expiration - now;

      if (distance <= 0) {
        clearInterval(interval);
        setTimeLeft("00:00");
        // Auto-fail instantly on the client
        await failStakeSession(activeSession.id);
        setActiveSession(null);
        router.refresh(); // Refresh server components (e.g. Navbar wallet balance)
        alert("Time is up! You lost your stake.");
      } else {
        const minutes = Math.floor(distance / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);
        setTimeLeft(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [activeSession]);

  // ── Global Anti-Cheat Clipboard Block ──────────────────────────────────────
  useEffect(() => {
    if (!activeSession) return;

    const blockClipboard = (e: ClipboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };

    const blockShortcuts = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && ['c', 'v', 'x'].includes(e.key.toLowerCase())) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    window.addEventListener("copy", blockClipboard, true);
    window.addEventListener("paste", blockClipboard, true);
    window.addEventListener("cut", blockClipboard, true);
    window.addEventListener("keydown", blockShortcuts, true);

    return () => {
      window.removeEventListener("copy", blockClipboard, true);
      window.removeEventListener("paste", blockClipboard, true);
      window.removeEventListener("cut", blockClipboard, true);
      window.removeEventListener("keydown", blockShortcuts, true);
    };
  }, [activeSession]);

  // ── Typing Speed Trap ──────────────────────────────────────────────────────
  const handleCodeChange = async (newCode: string) => {
    if (activeSession) {
      const delta = newCode.length - lastCodeLength.current;
      // If they magically typed more than 15 characters in a single event, they injected a script/pasted
      if (delta > 15) {
        try {
          await failStakeSession(activeSession.id);
          setActiveSession(null);
          router.refresh();
          alert("ANTI-CHEAT TRIGGERED: Impossible typing speed detected. You have lost your stake.");
        } catch (e) {
          console.error("Failed to fail session on speed trap", e);
        }
        return; // Reject the code change
      }
    }
    setCode(newCode);
    lastCodeLength.current = newCode.length;
  };

  // ── Execution / Submissions ──────────────────────────────────────────────────────
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
      lastCodeLength.current = lang.boilerplate.length;
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

      // Check if this submission ends the active session
      if (activeSession) {
        if (
          data.verdict === "accepted" ||
          (activeSession.mode === "one_shot" && data.verdict !== "accepted") ||
          data.verdict === "time_limit"
        ) {
          setActiveSession(null);
          router.refresh(); // Refresh server components (e.g. Navbar wallet balance)
        }
      }
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
        return "bg-[#00ff66] text-black border-2 border-black shadow-[2px_2px_0_0_#000]";
      case "wrong_answer":
        return "bg-[#ff3333] text-white border-2 border-black shadow-[2px_2px_0_0_#000]";
      case "time_limit":
        return "bg-[#ffcc00] text-black border-2 border-black shadow-[2px_2px_0_0_#000]";
      case "runtime_error":
      case "compilation_error":
        return "bg-[#ff3333] text-white border-2 border-black shadow-[2px_2px_0_0_#000]";
      default:
        return "bg-white text-black border-2 border-black shadow-[2px_2px_0_0_#000]";
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
    <div
      className="flex flex-col flex-1 overflow-hidden relative"
      onContextMenu={(e) => { if (activeSession) e.preventDefault(); }}
    >

      {/* ────────────────────── STAKE OVERLAY NAVBAR ────────────────────────── */}
      {activeSession && !showWagerModal && (
        <div className="fixed top-0 left-0 w-full h-[64px] bg-[#ff3333] z-50 flex items-center justify-between px-6 border-b-4 border-black shadow-[0_4px_0_0_#000]">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1 bg-white border-4 border-black shadow-[4px_4px_0_0_#000] -rotate-1">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full bg-[#ff3333] opacity-75"></span>
                <span className="relative inline-flex h-3 w-3 bg-black"></span>
              </span>
              <span className="text-sm font-black text-black tracking-widest uppercase">
                STAKE ACTIVE: ${(activeSession.amount_cents / 100).toFixed(2)}
              </span>
              <span className="ml-2 uppercase text-xs font-bold tracking-widest text-black bg-[#ffcc00] px-1 border-2 border-black">
                {activeSession.mode.replace("_", " ")}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-6">
            {activeSession.mode === "time_crunch" && (
              <span className="text-black font-black text-2xl bg-white border-4 border-black px-4 py-1 tracking-widest shadow-[inset_4px_4px_0_0_#000]">
                {timeLeft || "..."}
              </span>
            )}
            <button
              onClick={async () => {
                if (confirm("Are you sure you want to give up? You will instantly lose your stake!")) {
                  await failStakeSession(activeSession.id);
                  setActiveSession(null);
                  router.refresh(); // Refresh server components
                }
              }}
              className="text-sm font-black uppercase text-white bg-black border-2 border-black px-4 py-2 hover:bg-white hover:text-black transition-colors"
            >
              Give Up (Lose Stake)
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden relative">
        {/* Hardcore Mode: Wager Modal Overlay (blocks entire screen) */}
        {showWagerModal && (
          <div className="absolute inset-0 bg-white/95 z-50 flex flex-col items-center justify-center p-6 backdrop-blur-sm">
            <div className="nb-box p-8 max-w-md w-full text-center relative overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="absolute top-0 left-0 w-full h-2 bg-[#ff3333] border-b-4 border-black" />

              <h2 className="text-3xl font-black text-black mb-4 uppercase tracking-tighter bg-[#ffcc00] inline-block px-4 py-2 border-4 border-black shadow-[4px_4px_0_0_#000] -rotate-2">
                Hardcore Mode
              </h2>
              <p className="text-black font-bold uppercase tracking-widest text-sm mb-6">
                You must stake real money to view this problem. Configure your challenge below.
              </p>

              <div className="bg-white border-4 border-black p-6 mb-6 text-left space-y-4 shadow-[6px_6px_0_0_#000]">
                <div className="flex justify-between items-center text-sm border-b-2 border-black pb-2">
                  <span className="text-black font-black uppercase tracking-widest">Wallet Balance:</span>
                  <span className="text-white bg-[#00ff66] px-2 py-1 font-black text-lg border-2 border-black">${(walletBalance / 100).toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-sm border-b-2 border-black pb-2">
                  <span className="text-black font-black uppercase tracking-widest">Your Stake:</span>
                  <select
                    value={stakeAmount}
                    onChange={(e) => setStakeAmount(Number(e.target.value))}
                    className="bg-white border-2 border-black rounded-none px-2 py-1 text-black font-black cursor-pointer hover:bg-gray-100"
                  >
                    <option value={100}>$1.00</option>
                    <option value={500}>$5.00</option>
                    <option value={1000}>$10.00</option>
                    <option value={2000}>$20.00</option>
                  </select>
                </div>
                <div className="flex justify-between items-center text-sm border-b-2 border-black pb-2">
                  <span className="text-black font-black uppercase tracking-widest">Challenge Mode:</span>
                  <select
                    value={stakeMode}
                    onChange={(e) => setStakeMode(e.target.value)}
                    className="bg-white border-2 border-black rounded-none px-2 py-1 text-black font-black text-xs cursor-pointer hover:bg-gray-100"
                  >
                    <option value="time_crunch">⏱️ Time Crunch (Unlimited Tries)</option>
                    <option value="one_shot">🎯 One Shot (1 Try Only)</option>
                  </select>
                </div>
                {stakeMode === "time_crunch" && (
                  <div className="flex justify-between items-center text-sm pb-2">
                    <span className="text-black font-black uppercase tracking-widest">Timer (min):</span>
                    <input
                      type="number"
                      min="1"
                      max="1440"
                      value={timerDuration}
                      onChange={(e) => setTimerDuration(Number(e.target.value) || 1)}
                      className="bg-white border-2 border-black rounded-none px-2 py-1 text-black font-black text-xs w-24 text-right"
                    />
                  </div>
                )}
              </div>

              {stakeError && (
                <div className="text-white bg-black border-4 border-[#ff3333] font-bold text-sm mb-6 p-4 shadow-[4px_4px_0_0_#ff3333]">
                  {stakeError}
                </div>
              )}

              {walletBalance < 0 ? (
                <button
                  onClick={() => router.push('/wallet')}
                  className="nb-btn nb-btn-danger w-full py-4 text-xl tracking-[0.2em] mb-4"
                >
                  Honor Your Debt
                </button>
              ) : (
                <button
                  onClick={async () => {
                    setIsStaking(true);
                    setStakeError(null);
                    try {
                      // For One Shot, give them a generous 24-hour underlying timer
                      const finalDuration = stakeMode === "one_shot" ? 1440 : timerDuration;
                      const session = await createStakeSession(problem.id, stakeAmount, stakeMode, finalDuration);
                      setActiveSession(session);
                      setShowWagerModal(false);
                    } catch (err: any) {
                      setStakeError(err.message || "Failed to start session.");
                    } finally {
                      setIsStaking(false);
                    }
                  }}
                  disabled={isStaking}
                  className="nb-btn nb-btn-primary w-full py-4 text-xl tracking-[0.1em] mb-4 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isStaking ? "LOCKING IN..." : `COMMIT $${(stakeAmount / 100).toFixed(2)}`}
                </button>
              )}
              <button
                onClick={() => router.push('/problems')}
                className="text-black font-black uppercase tracking-widest text-sm hover:bg-black hover:text-white px-2 py-1 border-2 border-transparent hover:border-black transition-colors"
              >
                Cancel & Go Back
              </button>
            </div>
          </div>
        )}

        {/* Only render workspace if Wager Modal is NOT showing */}
        {!showWagerModal && (
          <>
            {/* ────────────────────── LEFT PANEL: Problem Description ────────────── */}
            {/* ────────────────────── LEFT PANEL: Problem Description ────────────── */}
            <div className="w-[45%] min-w-[320px] border-r-4 border-black flex flex-col overflow-hidden bg-white">
              {/* Tabs */}
              <div className="flex items-center border-b-4 border-black bg-white">
                <button
                  onClick={() => setActiveTab("description")}
                  className={`px-4 py-3 text-sm font-black uppercase tracking-widest transition-colors ${activeTab === "description"
                    ? "bg-[#ffcc00] text-black border-r-4 border-black shadow-[inset_-4px_-4px_0_0_rgba(0,0,0,0.1)]"
                    : "text-black hover:bg-gray-100 border-r-4 border-black"
                    }`}
                >
                  Description
                </button>
                <button
                  onClick={() => setActiveTab("submissions")}
                  className={`px-4 py-3 text-sm font-black uppercase tracking-widest transition-colors ${activeTab === "submissions"
                    ? "bg-[#00ff66] text-black border-r-4 border-black shadow-[inset_-4px_-4px_0_0_rgba(0,0,0,0.1)]"
                    : "text-black hover:bg-gray-100 border-r-4 border-black"
                    }`}
                >
                  Submissions
                </button>
              </div>

              {/* Scrollable content */}
              <div className={`flex-1 overflow-y-auto p-6 space-y-6 ${activeSession ? "select-none" : ""}`}>
                {activeTab === "description" ? (
                  <>
                    {/* Back link */}
                    <Link
                      href="/problems"
                      className="inline-flex items-center gap-1.5 text-sm font-black uppercase tracking-widest text-black hover:bg-[#ff3333] hover:text-white px-2 py-1 border-2 border-transparent hover:border-black transition-colors w-max"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                      </svg>
                      All Problems
                    </Link>

                    {/* Header */}
                    <div>
                      <div className="flex flex-wrap items-center gap-2 mb-4">
                        <span
                          className={`inline-flex px-2 py-0.5 text-xs font-black uppercase tracking-widest ${difficultyStyles[problem.difficulty] ?? ""
                            }`}
                        >
                          {problem.difficulty}
                        </span>
                        {problem.topics?.map((topic: string) => (
                          <span
                            key={topic}
                            className="bg-black text-white px-2 py-0.5 text-xs font-black uppercase tracking-widest border-2 border-black shadow-[2px_2px_0_0_#000]"
                          >
                            {topic}
                          </span>
                        ))}
                      </div>
                      <h1 className="text-4xl font-black tracking-tighter text-black uppercase leading-none">
                        {problem.title}
                      </h1>
                    </div>

                    {/* Description */}
                    <div className="bg-white border-4 border-black p-5 shadow-[4px_4px_0_0_#000]">
                      <h2 className="text-sm font-black text-black uppercase tracking-widest mb-4 bg-[#ffcc00] inline-block px-2 border-2 border-black">
                        Description
                      </h2>
                      <div className="text-sm text-black font-bold leading-relaxed whitespace-pre-wrap">
                        {problem.description}
                      </div>
                    </div>

                    {/* Constraints */}
                    {problem.constraints && (
                      <div className="bg-white border-4 border-black p-5 shadow-[4px_4px_0_0_#000]">
                        <h2 className="text-sm font-black text-black uppercase tracking-widest mb-4 bg-[#ff3333] text-white inline-block px-2 border-2 border-black">
                          Constraints
                        </h2>
                        <div className="text-sm text-black font-mono font-bold leading-relaxed whitespace-pre-wrap bg-gray-100 p-3 border-2 border-black">
                          {problem.constraints}
                        </div>
                      </div>
                    )}

                    {/* Example Test Cases */}
                    {exampleTestCases.length > 0 && (
                      <div className="space-y-4">
                        <h2 className="text-xl font-black text-black uppercase tracking-widest">
                          Examples
                        </h2>
                        {exampleTestCases.map((tc, i) => (
                          <div
                            key={tc.id}
                            className="bg-white border-4 border-black p-5 space-y-4 shadow-[4px_4px_0_0_#000]"
                          >
                            <h3 className="text-sm font-black text-black uppercase tracking-widest bg-[#00ff66] inline-block px-2 border-2 border-black">
                              Example {i + 1}
                            </h3>
                            <div>
                              <span className="text-xs font-black text-black uppercase tracking-widest mb-1 block">Input:</span>
                              <div className="bg-black text-[#00ff66] p-3 border-4 border-black font-mono text-sm whitespace-pre-wrap shadow-[4px_4px_0_0_#ffcc00]">
                                {tc.input}
                              </div>
                            </div>
                            <div>
                              <span className="text-xs font-black text-black uppercase tracking-widest mb-1 block">Output:</span>
                              <div className="bg-black text-[#ffcc00] p-3 border-4 border-black font-mono text-sm whitespace-pre-wrap shadow-[4px_4px_0_0_#00ff66]">
                                {tc.output}
                              </div>
                            </div>
                            {tc.explanation && (
                              <div>
                                <span className="text-xs font-black text-black uppercase tracking-widest mb-1 block">Explanation:</span>
                                <div className="text-sm text-black font-bold leading-relaxed whitespace-pre-wrap bg-gray-100 p-3 border-2 border-black">
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
                  <div className="space-y-6">
                    <h2 className="text-xl font-black text-black uppercase tracking-widest mb-4">
                      Past Submissions
                    </h2>

                    {isLoadingSubmissions ? (
                      <div className="flex justify-center py-8">
                        <span className="h-8 w-8 border-4 border-black border-t-transparent animate-spin" />
                      </div>
                    ) : submissions.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-48 bg-gray-100 border-4 border-black shadow-[4px_4px_0_0_#000]">
                        <p className="text-black font-black uppercase tracking-widest">No submissions yet.</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {submissions.map((sub) => {
                          const lang = LANGUAGES.find((l) => l.id === sub.language);
                          const isAccepted = sub.status === "accepted";
                          return (
                            <div
                              key={sub.id}
                              className="flex flex-col bg-white border-4 border-black p-4 shadow-[4px_4px_0_0_#000] hover:-translate-y-1 hover:translate-x-1 hover:shadow-[0_0_0_0_#000] transition-all"
                            >
                              <div className="flex items-center justify-between mb-3">
                                <span
                                  className={`inline-flex px-2 py-0.5 text-xs font-black uppercase tracking-widest ${verdictStyle(sub.status)}`}
                                >
                                  {verdictLabel(sub.status)}
                                </span>
                                <span className="text-xs font-bold text-black uppercase tracking-widest bg-gray-100 px-2 py-0.5 border-2 border-black">
                                  {new Date(sub.created_at).toLocaleDateString()} {new Date(sub.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              <div className="flex items-center gap-4 text-xs font-black text-black uppercase tracking-widest">
                                <span className="flex items-center gap-1.5 bg-[#ffcc00] px-2 py-0.5 border-2 border-black">
                                  {lang ? lang.label : sub.language}
                                </span>
                                {sub.runtime_ms !== null && <span className="bg-black text-white px-2 py-0.5 border-2 border-black">⏱️ {sub.runtime_ms}ms</span>}
                                {sub.memory_kb !== null && <span className="bg-black text-white px-2 py-0.5 border-2 border-black">💾 {(sub.memory_kb / 1024).toFixed(1)}MB</span>}
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
            <div className="flex-1 flex flex-col overflow-hidden bg-white">
              {/* Toolbar: Language selector + Run/Submit buttons */}
              <div className="flex items-center justify-between px-6 py-3 border-b-4 border-black bg-white">
                {/* Language picker */}
                <select
                  id="language-select"
                  value={selectedLanguage}
                  onChange={(e) => handleLanguageChange(e.target.value)}
                  className="bg-[#00ff66] border-4 border-black px-4 py-2 text-black font-black uppercase tracking-widest shadow-[4px_4px_0_0_#000] cursor-pointer focus:outline-none focus:bg-[#ffcc00] transition-colors"
                >
                  {LANGUAGES.map((lang) => (
                    <option key={lang.id} value={lang.id}>
                      {lang.label}
                    </option>
                  ))}
                </select>

                {/* Action buttons */}
                <div className="flex items-center gap-4">
                  <button
                    id="btn-run"
                    onClick={handleRun}
                    disabled={isRunning || isSubmitting}
                    className="nb-btn px-6 py-2 bg-[#ffcc00] text-black disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    {isRunning ? (
                      <>
                        <span className="h-4 w-4 border-4 border-black border-t-transparent animate-spin inline-block align-middle mr-2" />
                        RUNNING...
                      </>
                    ) : (
                      <>
                        RUN
                      </>
                    )}
                  </button>
                  <button
                    id="btn-submit"
                    onClick={handleSubmit}
                    disabled={isRunning || isSubmitting}
                    className="nb-btn px-6 py-2 bg-[#ff3333] text-white disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    {isSubmitting ? (
                      <>
                        <span className="h-4 w-4 border-4 border-white border-t-transparent animate-spin inline-block align-middle mr-2" />
                        SUBMITTING...
                      </>
                    ) : (
                      <>
                        SUBMIT
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Monaco Editor */}
              <div className="flex-1 overflow-hidden relative border-b-4 border-black">
                <CodeEditor
                  language={currentLang.monacoLang}
                  value={code}
                  onChange={handleCodeChange}
                  disableClipboard={!!activeSession}
                />
              </div>

              {/* ────────── Results Panel (collapsible) ────────── */}
              {resultsPanelOpen && (
                <div className="bg-white max-h-[40%] overflow-y-auto">
                  {/* Panel header */}
                  <div className="flex items-center justify-between px-6 py-3 border-b-4 border-black bg-[#ffcc00]">
                    <div className="flex items-center gap-4">
                      <span className="text-xl font-black text-black uppercase tracking-widest">
                        Results
                      </span>
                      {result && (
                        <span
                          className={`inline-flex px-3 py-1 text-sm font-black uppercase tracking-widest ${verdictStyle(result.verdict)}`}
                        >
                          {verdictLabel(result.verdict)}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => setResultsPanelOpen(false)}
                      className="text-black font-black uppercase text-2xl hover:bg-[#ff3333] hover:text-white px-2 py-1 border-2 border-transparent hover:border-black transition-colors"
                      aria-label="Close results"
                    >
                      ×
                    </button>
                  </div>

                  {/* Error message */}
                  {error && (
                    <div className="m-4 border-4 border-[#ff3333] bg-white p-4 text-black font-bold uppercase tracking-widest shadow-[4px_4px_0_0_#ff3333]">
                      {error}
                    </div>
                  )}

                  {/* Loading state */}
                  {(isRunning || isSubmitting) && !result && (
                    <div className="flex items-center justify-center py-12 text-black font-black uppercase tracking-widest gap-3">
                      <span className="h-6 w-6 border-4 border-black border-t-transparent animate-spin" />
                      {isRunning ? "Running against test cases..." : "Submitting..."}
                    </div>
                  )}

                  {/* Test case results */}
                  {result && (
                    <div className="p-6 space-y-4 bg-gray-100">
                      {result.results.map((tc) => (
                        <details
                          key={tc.index}
                          className="bg-white border-4 border-black shadow-[4px_4px_0_0_#000] overflow-hidden group"
                        >
                          <summary className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-[#00ff66] transition-colors">
                            <div className="flex items-center gap-3">
                              <span className={tc.passed ? "text-[#00ff66] bg-black px-1 border-2 border-black" : "text-[#ff3333] bg-black px-1 border-2 border-black"}>
                                {tc.passed ? "✅" : "❌"}
                              </span>
                              <span className="text-lg font-black text-black uppercase tracking-widest">
                                Test Case {tc.index + 1}
                              </span>
                            </div>
                            <div className="flex items-center gap-4 text-sm font-black text-black uppercase tracking-widest">
                              {tc.time && <span className="bg-white px-2 py-0.5 border-2 border-black">{tc.time}s</span>}
                              {tc.memory && <span className="bg-white px-2 py-0.5 border-2 border-black">{(tc.memory / 1024).toFixed(1)} MB</span>}
                              <span className="text-xl">▼</span>
                            </div>
                          </summary>
                          <div className="px-4 pb-4 space-y-4 border-t-4 border-black pt-4 bg-white">
                            <div>
                              <span className="text-sm font-black text-black uppercase tracking-widest block mb-2 bg-[#ffcc00] inline-block px-2 border-2 border-black">Input:</span>
                              <pre className="bg-black text-[#00ff66] p-4 border-4 border-black font-mono text-sm whitespace-pre-wrap shadow-[4px_4px_0_0_#00ff66]">
                                {tc.input}
                              </pre>
                            </div>
                            <div>
                              <span className="text-sm font-black text-black uppercase tracking-widest block mb-2 bg-[#ffcc00] inline-block px-2 border-2 border-black">Expected:</span>
                              <pre className="bg-black text-[#00ff66] p-4 border-4 border-black font-mono text-sm whitespace-pre-wrap shadow-[4px_4px_0_0_#00ff66]">
                                {tc.expectedOutput}
                              </pre>
                            </div>
                            <div>
                              <span className="text-sm font-black text-black uppercase tracking-widest block mb-2 bg-[#ffcc00] inline-block px-2 border-2 border-black">Your Output:</span>
                              <pre className={`bg-black p-4 border-4 border-black font-mono text-sm whitespace-pre-wrap shadow-[4px_4px_0_0_${tc.passed ? '#00ff66' : '#ff3333'}] ${tc.passed ? "text-[#00ff66]" : "text-[#ff3333]"
                                }`}>
                                {tc.actualOutput || "(no output)"}
                              </pre>
                            </div>
                            {tc.stderr && (
                              <div>
                                <span className="text-sm font-black text-white bg-[#ff3333] uppercase tracking-widest block mb-2 inline-block px-2 border-2 border-black">Stderr:</span>
                                <pre className="bg-black text-[#ff3333] p-4 border-4 border-black font-mono text-sm whitespace-pre-wrap shadow-[4px_4px_0_0_#ff3333]">
                                  {tc.stderr}
                                </pre>
                              </div>
                            )}
                          </div>
                        </details>
                      ))}

                      {/* Summary */}
                      {result.totalTime !== null && (
                        <div className="flex items-center gap-6 pt-4 text-sm font-black text-black uppercase tracking-widest">
                          <span className="bg-white border-4 border-black px-3 py-1 shadow-[4px_4px_0_0_#000]">Total: {result.totalTime}ms</span>
                          {result.totalMemory && (
                            <span className="bg-white border-4 border-black px-3 py-1 shadow-[4px_4px_0_0_#000]">Memory: {(result.totalMemory / 1024).toFixed(1)} MB</span>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
