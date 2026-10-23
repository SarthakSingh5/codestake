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
        <div className="text-center p-8 border-4 border-black bg-white shadow-[6px_6px_0_0_#000]">
          <p className="text-black font-black uppercase tracking-widest text-lg">You have no active pacts.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto px-4 mt-8 mb-24 relative z-10">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
        <h2 className="text-3xl font-black tracking-tighter text-black uppercase bg-[#00ff66] px-2 border-2 border-black shadow-[4px_4px_0_0_#000] -rotate-1">Active Pacts</h2>

        {/* Filter */}
        <div className="flex flex-wrap gap-2">
          {platforms.map((platform) => (
            <button
              key={platform}
              onClick={() => setPlatformFilter(platform)}
              className={`px-3 py-1.5 text-xs font-black uppercase tracking-widest border-2 transition ${platformFilter === platform
                ? "bg-black border-black text-white shadow-[2px_2px_0_0_#000]"
                : "bg-white border-black text-black hover:bg-[#ffcc00] shadow-[2px_2px_0_0_#000]"
                }`}
            >
              {platform === "all" ? "All Platforms" : platform}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
              className="group block relative overflow-hidden border-4 border-black bg-white p-6 transition hover:bg-gray-100 hover:-translate-y-1 hover:-translate-x-1 shadow-[4px_4px_0_0_#000] hover:shadow-[8px_8px_0_0_#000]"
            >
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-2 bg-[#ffcc00] border-2 border-black px-2 py-1 shadow-[2px_2px_0_0_#000]">
                  <span className="text-lg">{getPlatformIcon(session.problems.platform)}</span>
                  <span className="text-xs font-black text-black uppercase tracking-widest">
                    {session.problems.platform}
                  </span>
                </div>
                <div className="bg-[#ff3333] border-2 border-black px-2 py-1 text-xs font-black text-white uppercase tracking-widest shadow-[2px_2px_0_0_#000] animate-pulse">
                  Active
                </div>
              </div>

              <h3 className="text-xl font-black text-black uppercase tracking-tight mb-2 group-hover:text-[#ff3333] transition-colors line-clamp-2">
                {session.problems.title}
              </h3>

              <div className="flex items-center justify-between mt-6 border-t-4 border-black pt-4">
                <div>
                  <p className="text-xs text-black uppercase font-black tracking-widest">Mode</p>
                  <p className="text-sm text-black font-bold mt-1 bg-white border-2 border-black px-1">
                    {session.mode === 'one_shot' ? '🎯 One Shot' : '⏱️ Time Crunch'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-black uppercase font-black tracking-widest">Stake</p>
                  <p className="text-xl font-black text-[#00ff66] bg-black px-2 py-0.5 border-2 border-black mt-1">
                    ${(session.amount_cents / 100).toFixed(2)}
                  </p>
                </div>
              </div>
            </a>
          );
        })}
      </div>
      {filteredSessions.length === 0 && (
        <div className="text-center p-8 border-4 border-black bg-white mt-4 shadow-[4px_4px_0_0_#000]">
          <p className="text-black font-bold uppercase tracking-widest">No active pacts for this platform.</p>
        </div>
      )}
    </div>
  );
}
