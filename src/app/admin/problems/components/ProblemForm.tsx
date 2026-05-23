"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  createProblem,
  updateProblem,
  type ProblemFormData,
  type ExampleTestCaseInput,
  type HiddenTestCaseInput,
} from "../actions";

// ── Types ────────────────────────────────────────────────────────────────────
type ProblemFormProps = {
  mode: "create" | "edit";
  initialData?: {
    id: string;
    title: string;
    description: string;
    constraints: string;
    difficulty: "Easy" | "Medium" | "Hard";
    topics: string[];
    isPublished: boolean;
    exampleTestCases: ExampleTestCaseInput[];
    hiddenTestCases: HiddenTestCaseInput[];
  };
};

// ── Component ────────────────────────────────────────────────────────────────
export default function ProblemForm({ mode, initialData }: ProblemFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Form state
  const [title, setTitle] = useState(initialData?.title ?? "");
  const [description, setDescription] = useState(initialData?.description ?? "");
  const [constraints, setConstraints] = useState(initialData?.constraints ?? "");
  const [difficulty, setDifficulty] = useState<"Easy" | "Medium" | "Hard">(
    initialData?.difficulty ?? "Easy"
  );
  const [topics, setTopics] = useState<string[]>(initialData?.topics ?? []);
  const [topicInput, setTopicInput] = useState("");
  const [exampleTestCases, setExampleTestCases] = useState<ExampleTestCaseInput[]>(
    initialData?.exampleTestCases?.length
      ? initialData.exampleTestCases
      : [{ input: "", output: "", explanation: "" }]
  );
  const [hiddenTestCases, setHiddenTestCases] = useState<HiddenTestCaseInput[]>(
    initialData?.hiddenTestCases?.length
      ? initialData.hiddenTestCases
      : [{ input: "", output: "" }]
  );
  const [error, setError] = useState<string | null>(null);

  // ── Topic handlers ─────────────────────────────────────────────────────────
  function addTopic() {
    const tag = topicInput.trim().toLowerCase().replace(/\s+/g, "-");
    if (tag && !topics.includes(tag)) {
      setTopics([...topics, tag]);
    }
    setTopicInput("");
  }

  function removeTopic(tag: string) {
    setTopics(topics.filter((t) => t !== tag));
  }

  function handleTopicKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTopic();
    }
    if (e.key === "Backspace" && !topicInput && topics.length > 0) {
      setTopics(topics.slice(0, -1));
    }
  }

  // ── Example test case handlers ─────────────────────────────────────────────
  function addExampleTC() {
    setExampleTestCases([...exampleTestCases, { input: "", output: "", explanation: "" }]);
  }

  function removeExampleTC(index: number) {
    setExampleTestCases(exampleTestCases.filter((_, i) => i !== index));
  }

  function updateExampleTC(index: number, field: keyof ExampleTestCaseInput, value: string) {
    setExampleTestCases(
      exampleTestCases.map((tc, i) => (i === index ? { ...tc, [field]: value } : tc))
    );
  }

  // ── Hidden test case handlers ──────────────────────────────────────────────
  function addHiddenTC() {
    setHiddenTestCases([...hiddenTestCases, { input: "", output: "" }]);
  }

  function removeHiddenTC(index: number) {
    setHiddenTestCases(hiddenTestCases.filter((_, i) => i !== index));
  }

  function updateHiddenTC(index: number, field: keyof HiddenTestCaseInput, value: string) {
    setHiddenTestCases(
      hiddenTestCases.map((tc, i) => (i === index ? { ...tc, [field]: value } : tc))
    );
  }

  // ── Submit ─────────────────────────────────────────────────────────────────
  function handleSubmit(publish: boolean) {
    setError(null);

    const data: ProblemFormData = {
      title,
      description,
      constraints,
      difficulty,
      topics,
      exampleTestCases,
      hiddenTestCases,
      isPublished: publish,
    };

    startTransition(async () => {
      const result =
        mode === "create"
          ? await createProblem(data)
          : await updateProblem(initialData!.id, data);

      if (result?.error) {
        setError(result.error);
      }
      // On success, the server action redirects automatically
    });
  }

  // ── Shared input classes ───────────────────────────────────────────────────
  const inputClass =
    "w-full rounded-xl border border-white/10 bg-[#080d1a] px-3.5 py-2.5 text-sm text-white placeholder-slate-500 shadow-inner shadow-black/30 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/25 transition";
  const labelClass = "block text-sm font-medium text-slate-300 mb-1.5";
  const textareaClass = `${inputClass} resize-y min-h-[100px]`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#02050b] via-[#050c1d] to-[#071426] text-slate-100">
      {/* Ambient glow */}
      <div
        className="pointer-events-none fixed -top-32 left-1/2 -translate-x-1/2 h-96 w-96 rounded-full blur-3xl opacity-20"
        style={{ background: "radial-gradient(circle, #6366f1 0%, transparent 70%)" }}
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-4xl px-6 py-12">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/admin/problems"
            className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-indigo-300 transition mb-4"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back to Problems
          </Link>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            {mode === "create" ? "Create New Problem" : "Edit Problem"}
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            {mode === "create"
              ? "Fill in the details below to add a new coding problem."
              : "Update the problem details below."}
          </p>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* Form card */}
        <div className="rounded-2xl border border-white/10 bg-[#0b0f1e]/80 backdrop-blur shadow-2xl overflow-hidden">
          {/* ── Basic Info ──────────────────────────────────────────── */}
          <div className="p-6 border-b border-white/5">
            <h2 className="text-lg font-semibold text-white mb-5 flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/20 text-xs font-bold text-indigo-300">1</span>
              Basic Information
            </h2>

            <div className="space-y-4">
              {/* Title */}
              <div>
                <label htmlFor="problem-title" className={labelClass}>
                  Title <span className="text-red-400">*</span>
                </label>
                <input
                  id="problem-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Two Sum"
                  className={inputClass}
                  required
                />
              </div>

              {/* Difficulty + Topics row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Difficulty */}
                <div>
                  <label htmlFor="problem-difficulty" className={labelClass}>
                    Difficulty
                  </label>
                  <select
                    id="problem-difficulty"
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value as "Easy" | "Medium" | "Hard")}
                    className={`${inputClass} cursor-pointer`}
                  >
                    <option value="Easy">🟢 Easy</option>
                    <option value="Medium">🟡 Medium</option>
                    <option value="Hard">🔴 Hard</option>
                  </select>
                </div>

                {/* Topics */}
                <div>
                  <label htmlFor="problem-topics" className={labelClass}>
                    Topics <span className="text-slate-500 text-xs">(press Enter to add)</span>
                  </label>
                  <div className={`${inputClass} flex flex-wrap gap-1.5 items-center !py-1.5 min-h-[42px]`}>
                    {topics.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 rounded-full bg-indigo-500/20 px-2.5 py-0.5 text-xs font-medium text-indigo-300 ring-1 ring-indigo-400/20"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => removeTopic(tag)}
                          className="ml-0.5 hover:text-red-300 transition"
                          aria-label={`Remove ${tag}`}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                    <input
                      id="problem-topics"
                      type="text"
                      value={topicInput}
                      onChange={(e) => setTopicInput(e.target.value)}
                      onKeyDown={handleTopicKeyDown}
                      onBlur={addTopic}
                      placeholder={topics.length === 0 ? "e.g. arrays, hash-map" : ""}
                      className="flex-1 min-w-[80px] bg-transparent border-none outline-none text-sm text-white placeholder-slate-500 p-1"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Description ────────────────────────────────────────── */}
          <div className="p-6 border-b border-white/5">
            <h2 className="text-lg font-semibold text-white mb-5 flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/20 text-xs font-bold text-indigo-300">2</span>
              Problem Statement
            </h2>

            <div className="space-y-4">
              <div>
                <label htmlFor="problem-description" className={labelClass}>
                  Description <span className="text-red-400">*</span>
                </label>
                <textarea
                  id="problem-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Write the full problem description here..."
                  className={`${textareaClass} min-h-[200px]`}
                  required
                />
              </div>

              <div>
                <label htmlFor="problem-constraints" className={labelClass}>
                  Constraints
                </label>
                <textarea
                  id="problem-constraints"
                  value={constraints}
                  onChange={(e) => setConstraints(e.target.value)}
                  placeholder="e.g. 1 <= nums.length <= 10^4&#10;-10^9 <= nums[i] <= 10^9"
                  className={textareaClass}
                />
              </div>
            </div>
          </div>

          {/* ── Example Test Cases ─────────────────────────────────── */}
          <div className="p-6 border-b border-white/5">
            <h2 className="text-lg font-semibold text-white mb-5 flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/20 text-xs font-bold text-emerald-300">3</span>
              Example Test Cases
              <span className="text-xs font-normal text-slate-400 ml-1">(visible to users)</span>
            </h2>

            <div className="space-y-4">
              {exampleTestCases.map((tc, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-white/5 bg-[#080d1a]/60 p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Example {i + 1}
                    </span>
                    {exampleTestCases.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeExampleTC(i)}
                        className="text-xs text-red-400 hover:text-red-300 transition"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">Input</label>
                      <textarea
                        value={tc.input}
                        onChange={(e) => updateExampleTC(i, "input", e.target.value)}
                        placeholder="e.g. nums = [2,7,11,15], target = 9"
                        className={`${inputClass} resize-y min-h-[70px] text-xs font-mono`}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">Output</label>
                      <textarea
                        value={tc.output}
                        onChange={(e) => updateExampleTC(i, "output", e.target.value)}
                        placeholder="e.g. [0, 1]"
                        className={`${inputClass} resize-y min-h-[70px] text-xs font-mono`}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">
                      Explanation <span className="text-slate-500">(optional)</span>
                    </label>
                    <textarea
                      value={tc.explanation ?? ""}
                      onChange={(e) => updateExampleTC(i, "explanation", e.target.value)}
                      placeholder="Because nums[0] + nums[1] == 9, we return [0, 1]."
                      className={`${inputClass} resize-y min-h-[50px] text-xs`}
                    />
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={addExampleTC}
                className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-white/10 px-4 py-2 text-sm text-slate-400 hover:border-emerald-400/30 hover:text-emerald-300 transition"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Add Example Test Case
              </button>
            </div>
          </div>

          {/* ── Hidden Test Cases ──────────────────────────────────── */}
          <div className="p-6 border-b border-white/5">
            <h2 className="text-lg font-semibold text-white mb-5 flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/20 text-xs font-bold text-amber-300">4</span>
              Hidden Test Cases
              <span className="text-xs font-normal text-slate-400 ml-1">(admin only — used for judging)</span>
            </h2>

            <div className="space-y-4">
              {hiddenTestCases.map((tc, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-white/5 bg-[#080d1a]/60 p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Hidden {i + 1}
                    </span>
                    {hiddenTestCases.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeHiddenTC(i)}
                        className="text-xs text-red-400 hover:text-red-300 transition"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">Input</label>
                      <textarea
                        value={tc.input}
                        onChange={(e) => updateHiddenTC(i, "input", e.target.value)}
                        placeholder="Test input"
                        className={`${inputClass} resize-y min-h-[70px] text-xs font-mono`}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">Output</label>
                      <textarea
                        value={tc.output}
                        onChange={(e) => updateHiddenTC(i, "output", e.target.value)}
                        placeholder="Expected output"
                        className={`${inputClass} resize-y min-h-[70px] text-xs font-mono`}
                      />
                    </div>
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={addHiddenTC}
                className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-white/10 px-4 py-2 text-sm text-slate-400 hover:border-amber-400/30 hover:text-amber-300 transition"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Add Hidden Test Case
              </button>
            </div>
          </div>

          {/* ── Actions ────────────────────────────────────────────── */}
          <div className="p-6 flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#060a16]/50">
            <button
              type="button"
              onClick={() => router.push("/admin/problems")}
              className="text-sm text-slate-400 hover:text-white transition"
            >
              Cancel
            </button>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => handleSubmit(false)}
                disabled={isPending}
                className="rounded-full border border-white/10 bg-white/[0.04] px-6 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-white/10 hover:text-white active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPending ? "Saving…" : "Save as Draft"}
              </button>
              <button
                type="button"
                onClick={() => handleSubmit(true)}
                disabled={isPending}
                className="rounded-full bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-900/40 transition hover:bg-indigo-500 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPending ? "Publishing…" : mode === "create" ? "Save & Publish" : "Update & Publish"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
