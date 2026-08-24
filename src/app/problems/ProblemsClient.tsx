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
  Easy: "bg-[#00ff66] text-black border-2 border-black shadow-[2px_2px_0_0_#000]",
  Medium: "bg-[#ffcc00] text-black border-2 border-black shadow-[2px_2px_0_0_#000]",
  Hard: "bg-[#ff3333] text-white border-2 border-black shadow-[2px_2px_0_0_#000]",
};

// ── Status icons ─────────────────────────────────────────────────────────────
function StatusIcon({ status }: { status?: "solved" | "attempted" }) {
  if (status === "solved") {
    return (
      <span className="flex items-center justify-center w-5 h-5 rounded-none bg-[#00ff66] border-2 border-black shadow-[2px_2px_0_0_#000]" title="Solved">
        <svg className="w-3 h-3 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </span>
    );
  }
  if (status === "attempted") {
    return (
      <span className="flex items-center justify-center w-5 h-5 rounded-none bg-[#ffcc00] border-2 border-black shadow-[2px_2px_0_0_#000]" title="Attempted">
        <span className="w-2 h-2 bg-black" />
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
        className={`inline-flex items-center gap-1.5 border-4 px-3 py-1.5 text-sm font-black uppercase tracking-widest transition cursor-pointer shadow-[4px_4px_0_0_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[0px_0px_0px_0px_rgba(0,0,0,1)] ${isActive
            ? "border-black bg-[#ffcc00] text-black"
            : "border-black bg-white text-black hover:bg-gray-200"
          }`}
      >
        {label}{isActive ? `: ${value}` : ""}
        <svg className={`w-3.5 h-3.5 transition ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-2 z-50 min-w-[140px] border-4 border-black bg-white shadow-[6px_6px_0_0_#000]">
          {options.map((option) => (
            <button
              key={option}
              onClick={() => {
                onChange(option);
                setOpen(false);
              }}
              className={`w-full text-left px-4 py-3 text-sm font-bold border-b-2 border-black last:border-b-0 transition uppercase ${value === option
                  ? "bg-[#ffcc00] text-black"
                  : "text-black hover:bg-gray-100"
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
        className={`inline-flex items-center gap-1.5 border-4 px-3 py-1.5 text-sm font-black uppercase tracking-widest transition cursor-pointer shadow-[4px_4px_0_0_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[0px_0px_0px_0px_rgba(0,0,0,1)] ${isActive
            ? "border-black bg-[#ffcc00] text-black"
            : "border-black bg-white text-black hover:bg-gray-200"
          }`}
      >
        Topics{isActive ? ` (${selected.length})` : ""}
        <svg className={`w-3.5 h-3.5 transition ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-2 z-50 min-w-[180px] max-h-[240px] overflow-y-auto border-4 border-black bg-white shadow-[6px_6px_0_0_#000]">
          {allTopics.length === 0 ? (
            <div className="px-4 py-3 text-xs font-bold text-black uppercase">No topics available</div>
          ) : (
            allTopics.map((topic) => (
              <button
                key={topic}
                onClick={() => toggle(topic)}
                className="w-full flex items-center gap-2 text-left px-4 py-3 text-sm font-bold border-b-2 border-black last:border-b-0 hover:bg-gray-100 transition text-black"
              >
                <span
                  className={`flex items-center justify-center w-5 h-5 border-2 border-black transition ${selected.includes(topic)
                      ? "bg-[#00ff66]"
                      : "bg-white"
                    }`}
                >
                  {selected.includes(topic) && (
                    <svg className="w-3 h-3 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}>
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
      <div className="mb-4 flex flex-wrap items-center gap-4">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-[320px]">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-black"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={3}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            id="search-problems"
            type="text"
            placeholder="Search by # or name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full border-4 border-black bg-white pl-10 pr-4 py-2 text-sm text-black font-bold placeholder-gray-500 focus:outline-none focus:bg-[#ffcc00] transition shadow-[4px_4px_0_0_#000]"
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
            className="text-xs font-black uppercase text-black hover:bg-black hover:text-white border-2 border-transparent hover:border-black px-2 py-1 transition ml-1"
          >
            Clear all
          </button>
        )}
      </div>

      {/* ── Active Filter Chips ─────────────────────────────────────── */}
      {hasActiveFilters && (
        <div className="mb-6 flex flex-wrap items-center gap-3">
          {difficultyFilter !== "All" && (
            <span className="inline-flex items-center gap-1 border-2 border-black bg-white px-3 py-1 text-xs font-bold text-black shadow-[2px_2px_0_0_#000]">
              Difficulty: {difficultyFilter}
              <button onClick={() => setDifficultyFilter("All")} className="ml-1 hover:text-[#ff3333] font-black">×</button>
            </span>
          )}
          {statusFilter !== "All" && (
            <span className="inline-flex items-center gap-1 border-2 border-black bg-white px-3 py-1 text-xs font-bold text-black shadow-[2px_2px_0_0_#000]">
              Status: {statusFilter}
              <button onClick={() => setStatusFilter("All")} className="ml-1 hover:text-[#ff3333] font-black">×</button>
            </span>
          )}
          {topicFilter.map((t) => (
            <span key={t} className="inline-flex items-center gap-1 border-2 border-black bg-white px-3 py-1 text-xs font-bold text-black shadow-[2px_2px_0_0_#000]">
              {t}
              <button onClick={() => setTopicFilter(topicFilter.filter((x) => x !== t))} className="ml-1 hover:text-[#ff3333] font-black">×</button>
            </span>
          ))}
        </div>
      )}

      {/* ── Problems Table ──────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div className="border-4 border-black bg-white p-12 flex flex-col items-center justify-center text-center shadow-[6px_6px_0_0_#000]">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center border-4 border-black bg-[#ffcc00] shadow-[4px_4px_0_0_#000]">
            <span className="text-2xl font-black">{hasActiveFilters ? "🔍" : "📝"}</span>
          </div>
          <h3 className="text-xl font-black uppercase text-black">
            {hasActiveFilters ? "No matching problems" : "No problems available yet"}
          </h3>
          <p className="mt-2 text-sm text-black font-bold max-w-sm">
            {hasActiveFilters
              ? "Try adjusting your search or filters."
              : "We are currently preparing the problem set. Check back later to start your coding journey."}
          </p>
        </div>
      ) : (
        <div className="border-4 border-black bg-white overflow-hidden shadow-[6px_6px_0_0_#000]">
          {/* Table header */}
          <div className="hidden md:grid grid-cols-[36px_auto_1fr_100px_1fr] gap-4 px-6 py-4 border-b-4 border-black bg-[#ffcc00] text-sm font-black text-black uppercase tracking-widest">
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
                className="grid grid-cols-1 md:grid-cols-[36px_auto_1fr_100px_1fr] gap-3 md:gap-4 px-6 py-4 border-b-2 border-black last:border-b-0 hover:bg-gray-100 transition items-center group"
              >
                {/* Status */}
                <span className="hidden md:flex">
                  <StatusIcon status={status} />
                </span>

                {/* Number */}
                <span className="hidden md:block w-8 text-sm text-black font-black">
                  {num}
                </span>

                {/* Title */}
                <span className="text-base font-black uppercase text-black group-hover:text-[#ff3333] transition">
                  {problem.title}
                </span>

                {/* Difficulty */}
                <span
                  className={`inline-flex self-start md:self-center w-fit px-2 py-0.5 text-xs font-black uppercase ${difficultyStyles[problem.difficulty] ?? ""
                    }`}
                >
                  {problem.difficulty}
                </span>

                {/* Topics */}
                <div className="flex flex-wrap gap-2">
                  {(problem.topics as string[])?.map((topic: string) => (
                    <span
                      key={topic}
                      className="border-2 border-black bg-white px-2 py-0.5 text-xs font-bold text-black shadow-[2px_2px_0_0_#000]"
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
