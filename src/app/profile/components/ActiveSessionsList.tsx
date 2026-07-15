"use client";

import { useState } from "react";

type Session = {
  id: string;
  problem_id: string;
  amount_cents: number;
  mode: string;
  status: string;
  expires_at: string | null;
  created_at: string;
  problems: {
    title: string;
    slug: string;
    platform: string;
  };
};

export default function ActiveSessionsList({ sessions }: { sessions: Session[] }) {
  const [platformFilter, setPlatformFilter] = useState<string>("all");

  const validSessions = sessions.filter(s => s.problems !== null);
  const platforms = ["all", ...Array.from(new Set(validSessions.map(s => s.problems.platform)))];

  const filteredSessions = validSessions.filter(
    (s) => platformFilter === "all" || s.problems.platform === platformFilter
  );

  const getPlatformIcon = (platform: string) => {
    if (platform === "leetcode") return "🔶";
    if (platform === "hackerrank") return "🟩";
    if (platform === "codeforces") return "📊";
    return "💻";
  };

  if (sessions.length === 0) {
    return (
      <div className="w-full max-w-4xl mx-auto px-4 mt-8 mb-24 relative z-10">
        <div className="text-center p-8 border border-white/5 rounded-2xl bg-white/[0.02] backdrop-blur-sm">
          <p className="text-slate-500 font-serif italic">You have no active pacts.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto px-4 mt-8 mb-24 relative z-10">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold tracking-widest text-slate-200 uppercase">Active Pacts</h2>
        
        {/* Filter */}
        <div className="flex gap-2">
          {platforms.map((platform) => (
            <button
              key={platform}
              onClick={() => setPlatformFilter(platform)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-full border transition ${
                platformFilter === platform
                  ? "bg-indigo-500/20 border-indigo-500/50 text-indigo-300"
                  : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10"
              }`}
            >
              {platform === "all" ? "All Platforms" : platform.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredSessions.map((session) => {
          // Construct the URL to redirect them back to the problem
          const url = session.problems.platform === "leetcode"
            ? `https://leetcode.com/problems/${session.problems.slug}`
            : "#"; // Add other platform logic later

          return (
            <a
              key={session.id}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="group block relative overflow-hidden rounded-xl border border-white/10 bg-[#0b0f1e]/60 p-5 backdrop-blur-md transition hover:border-indigo-500/50 hover:bg-[#0b0f1e]/80 hover:shadow-[0_0_20px_rgba(99,102,241,0.2)]"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{getPlatformIcon(session.problems.platform)}</span>
                  <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                    {session.problems.platform}
                  </span>
                </div>
                <div className="rounded-full bg-red-500/20 border border-red-500/30 px-2 py-0.5 text-[10px] font-bold text-red-400 uppercase tracking-widest animate-pulse">
                  Active
                </div>
              </div>
              
              <h3 className="text-lg font-bold text-slate-200 mb-1 group-hover:text-indigo-400 transition-colors">
                {session.problems.title}
              </h3>
              
              <div className="flex items-center justify-between mt-4 border-t border-white/5 pt-4">
                <div>
                  <p className="text-[10px] text-slate-500 uppercase font-semibold">Mode</p>
                  <p className="text-sm text-slate-300 font-mono">
                    {session.mode === 'one_shot' ? '🎯 One Shot' : '⏱️ Time Crunch'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-slate-500 uppercase font-semibold">Stake</p>
                  <p className="text-sm font-bold text-emerald-400 font-mono">
                    ${(session.amount_cents / 100).toFixed(2)}
                  </p>
                </div>
              </div>
            </a>
          );
        })}
      </div>
      {filteredSessions.length === 0 && (
        <div className="text-center p-8 border border-white/5 rounded-xl bg-white/[0.02]">
          <p className="text-slate-500 text-sm">No active pacts for this platform.</p>
        </div>
      )}
    </div>
  );
}
