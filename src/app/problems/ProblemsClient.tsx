"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";

// ── Types ────────────────────────────────────────────────────────────────────
type Problem = {
  id: string;
  title: string;
  slug: string;
  difficulty: string;
  topics: string[];
  created_at: string;
};

type ProblemsClientProps = {
  problems: Problem[];
  statusMap: Record<string, "solved" | "attempted">;
  allTopics: string[];
};

// ── Difficulty badge colors ──────────────────────────────────────────────────
const difficultyStyles: Record<string, string> = {
  Easy: "bg-emerald-500/15 text-emerald-300 ring-emerald-400/20",
  Medium: "bg-amber-500/15 text-amber-300 ring-amber-400/20",
  Hard: "bg-red-500/15 text-red-300 ring-red-400/20",
};

// ── Status icons ─────────────────────────────────────────────────────────────
function StatusIcon({ status }: { status?: "solved" | "attempted" }) {
  if (status === "solved") {
    return (
      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500/20" title="Solved">
        <svg className="w-3 h-3 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </span>
    );
  }
  if (status === "attempted") {
    return (
      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-amber-500/20" title="Attempted">
        <span className="w-2 h-2 rounded-full bg-amber-400" />
      </span>
    );
  }
  return <span className="w-5 h-5" />;
}

// ── Dropdown Component ───────────────────────────────────────────────────────
function FilterDropdown({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (val: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isActive = value !== "All";

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition cursor-pointer ${
          isActive
            ? "border-indigo-500/50 bg-indigo-500/10 text-indigo-300"
            : "border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.06]"
        }`}
      >
        {label}{isActive ? `: ${value}` : ""}
        <svg className={`w-3.5 h-3.5 transition ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1.5 z-50 min-w-[140px] rounded-xl border border-white/10 bg-[#0b0f1e] shadow-2xl shadow-black/50 py-1 backdrop-blur-xl">
          {options.map((option) => (
            <button
              key={option}
              onClick={() => {
                onChange(option);
                setOpen(false);
              }}
              className={`w-full text-left px-3 py-2 text-sm transition ${
                value === option
                  ? "bg-indigo-500/15 text-indigo-300"
                  : "text-slate-300 hover:bg-white/[0.05]"
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Topic Multi-Select Dropdown ──────────────────────────────────────────────
function TopicDropdown({
  allTopics,
  selected,
  onChange,
}: {
  allTopics: string[];
  selected: string[];
  onChange: (topics: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isActive = selected.length > 0;

  function toggle(topic: string) {
    if (selected.includes(topic)) {
      onChange(selected.filter((t) => t !== topic));
    } else {
      onChange([...selected, topic]);
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition cursor-pointer ${
          isActive
            ? "border-indigo-500/50 bg-indigo-500/10 text-indigo-300"
            : "border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.06]"
        }`}
      >
        Topics{isActive ? ` (${selected.length})` : ""}
        <svg className={`w-3.5 h-3.5 transition ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1.5 z-50 min-w-[180px] max-h-[240px] overflow-y-auto rounded-xl border border-white/10 bg-[#0b0f1e] shadow-2xl shadow-black/50 py-1 backdrop-blur-xl">
          {allTopics.length === 0 ? (
            <div className="px-3 py-2 text-xs text-slate-500">No topics available</div>
          ) : (
            allTopics.map((topic) => (
              <button
                key={topic}
                onClick={() => toggle(topic)}
                className="w-full flex items-center gap-2 text-left px-3 py-2 text-sm text-slate-300 hover:bg-white/[0.05] transition"
              >
                <span
                  className={`flex items-center justify-center w-4 h-4 rounded border transition ${
                    selected.includes(topic)
                      ? "bg-indigo-500 border-indigo-500"
                      : "border-white/20 bg-transparent"
                  }`}
                >
                  {selected.includes(topic) && (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </span>
                {topic}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────
export default function ProblemsClient({
  problems,
  statusMap,
  allTopics,
}: ProblemsClientProps) {
  const [search, setSearch] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [topicFilter, setTopicFilter] = useState<string[]>([]);

  // ── Filter logic ────────────────────────────────────────────────────────────
  const filtered = problems.filter((problem, index) => {
    const num = index + 1;

    // Search: match by number or name
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const matchesNumber = num.toString() === q;
      const matchesName = problem.title.toLowerCase().includes(q);
      if (!matchesNumber && !matchesName) return false;
    }

    // Difficulty filter
    if (difficultyFilter !== "All" && problem.difficulty !== difficultyFilter) {
      return false;
    }

    // Status filter
    if (statusFilter !== "All") {
      const status = statusMap[problem.id];
      if (statusFilter === "Solved" && status !== "solved") return false;
      if (statusFilter === "Attempted" && status !== "attempted") return false;
      if (statusFilter === "Not Attempted" && status !== undefined) return false;
    }

    // Topic filter (AND logic: problem must have ALL selected topics)
    if (topicFilter.length > 0) {
      const problemTopics = (problem.topics as string[]) ?? [];
      for (const t of topicFilter) {
        if (!problemTopics.includes(t)) return false;
      }
    }

    return true;
  });

  // Check if any filter is active
  const hasActiveFilters =
    search.trim() !== "" ||
    difficultyFilter !== "All" ||
    statusFilter !== "All" ||
    topicFilter.length > 0;

  function clearAllFilters() {
    setSearch("");
    setDifficultyFilter("All");
    setStatusFilter("All");
    setTopicFilter([]);
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Filter Bar ──────────────────────────────────────────────── */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-[320px]">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            id="search-problems"
            type="text"
            placeholder="Search by # or name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-white/[0.03] pl-9 pr-3 py-1.5 text-sm text-white placeholder-slate-500 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/25 transition"
          />
        </div>

        {/* Filters */}
        <FilterDropdown
          label="Difficulty"
          options={["All", "Easy", "Medium", "Hard"]}
          value={difficultyFilter}
          onChange={setDifficultyFilter}
        />
        <FilterDropdown
          label="Status"
          options={["All", "Solved", "Attempted", "Not Attempted"]}
          value={statusFilter}
          onChange={setStatusFilter}
        />
        <TopicDropdown
          allTopics={allTopics}
          selected={topicFilter}
          onChange={setTopicFilter}
        />

        {/* Clear all */}
        {hasActiveFilters && (
          <button
            onClick={clearAllFilters}
            className="text-xs text-slate-500 hover:text-white transition ml-1"
          >
            Clear all
          </button>
        )}
      </div>

      {/* ── Active Filter Chips ─────────────────────────────────────── */}
      {hasActiveFilters && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {difficultyFilter !== "All" && (
            <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-0.5 text-xs text-indigo-300">
              Difficulty: {difficultyFilter}
              <button onClick={() => setDifficultyFilter("All")} className="ml-0.5 hover:text-white">×</button>
            </span>
          )}
          {statusFilter !== "All" && (
            <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-0.5 text-xs text-indigo-300">
              Status: {statusFilter}
              <button onClick={() => setStatusFilter("All")} className="ml-0.5 hover:text-white">×</button>
            </span>
          )}
          {topicFilter.map((t) => (
            <span key={t} className="inline-flex items-center gap-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-0.5 text-xs text-indigo-300">
              {t}
              <button onClick={() => setTopicFilter(topicFilter.filter((x) => x !== t))} className="ml-0.5 hover:text-white">×</button>
            </span>
          ))}
        </div>
      )}

      {/* ── Problems Table ──────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-[#0b0f1e]/80 p-12 backdrop-blur flex flex-col items-center justify-center text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/5 ring-1 ring-white/10">
            <span className="text-2xl">{hasActiveFilters ? "🔍" : "📝"}</span>
          </div>
          <h3 className="text-lg font-medium text-white">
            {hasActiveFilters ? "No matching problems" : "No problems available yet"}
          </h3>
          <p className="mt-2 text-sm text-slate-400 max-w-sm">
            {hasActiveFilters
              ? "Try adjusting your search or filters."
              : "We are currently preparing the problem set. Check back later to start your coding journey."}
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-white/10 bg-[#0b0f1e]/80 backdrop-blur overflow-hidden">
          {/* Table header */}
          <div className="hidden md:grid grid-cols-[28px_auto_1fr_100px_1fr] gap-4 px-6 py-3 border-b border-white/5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            <span>St</span>
            <span className="w-8">#</span>
            <span>Title</span>
            <span>Difficulty</span>
            <span>Topics</span>
          </div>

          {/* Rows */}
          {filtered.map((problem) => {
            // Find the original index to compute the problem number
            const originalIndex = problems.indexOf(problem);
            const num = originalIndex + 1;
            const status = statusMap[problem.id];

            return (
              <Link
                key={problem.id}
                href={`/problems/${problem.slug}`}
                className="grid grid-cols-1 md:grid-cols-[28px_auto_1fr_100px_1fr] gap-3 md:gap-4 px-6 py-4 border-b border-white/5 last:border-b-0 hover:bg-white/[0.03] transition items-center group"
              >
                {/* Status */}
                <span className="hidden md:flex">
                  <StatusIcon status={status} />
                </span>

                {/* Number */}
                <span className="hidden md:block w-8 text-sm text-slate-500 font-mono">
                  {num}
                </span>

                {/* Title */}
                <span className="text-sm font-medium text-white group-hover:text-indigo-300 transition">
                  {problem.title}
                </span>

                {/* Difficulty */}
                <span
                  className={`inline-flex self-start md:self-center w-fit rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${
                    difficultyStyles[problem.difficulty] ?? ""
                  }`}
                >
                  {problem.difficulty}
                </span>

                {/* Topics */}
                <div className="flex flex-wrap gap-1">
                  {(problem.topics as string[])?.map((topic: string) => (
                    <span
                      key={topic}
                      className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-400"
                    >
                      {topic}
                    </span>
                  ))}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
