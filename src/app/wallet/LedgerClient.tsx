"use client";

import { useState } from "react";

export interface LedgerItem {
  id: string;
  category: "defended" | "lost";
  amount_cents: number;
  created_at: string;
  label: string;
  detail: string;
  icon: string;
  tag: string;
  badgeBg: string;
  badgeText: string;
  reference_id: string | null;
}

function formatDate(isoString: string) {
  try {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(isoString));
  } catch {
    return isoString;
  }
}

export default function LedgerClient({ items }: { items: LedgerItem[] }) {
  const [filter, setFilter] = useState<"defended" | "lost" | "all">("defended");
  const [visibleCount, setVisibleCount] = useState(10);

  const defendedCount = items.filter((i) => i.category === "defended").length;
  const lostCount = items.filter((i) => i.category === "lost").length;

  const filteredItems = items.filter((item) => {
    if (filter === "all") return true;
    return item.category === filter;
  });

  const visibleItems = filteredItems.slice(0, visibleCount);
  const hasMore = filteredItems.length > visibleCount;

  function handleFilterChange(newFilter: "defended" | "lost" | "all") {
    setFilter(newFilter);
    setVisibleCount(10);
  }

  return (
    <div className="nb-box overflow-hidden bg-white border-4 border-black shadow-[8px_8px_0_0_#000]">
      {/* Ledger Header */}
      <div className="px-6 py-4 border-b-4 border-black bg-black text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black uppercase tracking-widest flex items-center gap-2">
            <span>Challenge Match History</span>
            <span className="text-xs font-black uppercase bg-[#ffcc00] text-black px-2 py-0.5 border border-white">
              {filteredItems.length} {filter === "defended" ? "Victories" : filter === "lost" ? "Defeats" : "Battles"}
            </span>
          </h2>
          <p className="text-xs text-gray-300 font-bold uppercase tracking-wider mt-0.5">
            Itemized battle record of stakes defended and penalties incurred under pressure.
          </p>
        </div>

        {/* Filter Pills (Defaulted to Defended) */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => handleFilterChange("defended")}
            className={`px-3 py-1.5 text-xs font-black uppercase tracking-wider border-2 border-white transition-transform active:translate-x-0.5 active:translate-y-0.5 ${
              filter === "defended"
                ? "bg-[#00ff66] text-black shadow-[2px_2px_0_0_#fff]"
                : "bg-black text-white hover:bg-neutral-800"
            }`}
          >
            🛡️ Defended ({defendedCount})
          </button>
          <button
            onClick={() => handleFilterChange("lost")}
            className={`px-3 py-1.5 text-xs font-black uppercase tracking-wider border-2 border-white transition-transform active:translate-x-0.5 active:translate-y-0.5 ${
              filter === "lost"
                ? "bg-[#ff3333] text-white shadow-[2px_2px_0_0_#fff]"
                : "bg-black text-white hover:bg-neutral-800"
            }`}
          >
            ⚡ Lost ({lostCount})
          </button>
          <button
            onClick={() => handleFilterChange("all")}
            className={`px-3 py-1.5 text-xs font-black uppercase tracking-wider border-2 border-white transition-transform active:translate-x-0.5 active:translate-y-0.5 ${
              filter === "all"
                ? "bg-[#ffcc00] text-black shadow-[2px_2px_0_0_#fff]"
                : "bg-black text-white hover:bg-neutral-800"
            }`}
          >
            All Battles ({items.length})
          </button>
        </div>
      </div>

      {/* Empty State */}
      {filteredItems.length === 0 ? (
        <div className="p-12 text-center text-black font-bold uppercase tracking-widest bg-gray-50">
          <div className="w-16 h-16 bg-[#ffcc00] border-4 border-black flex items-center justify-center mx-auto mb-4 shadow-[4px_4px_0_0_#000] text-2xl">
            📋
          </div>
          <h3 className="text-lg font-black text-black mb-1">No Matches Recorded</h3>
          <p className="text-xs text-gray-600 max-w-sm mx-auto mb-6">
            {filter === "defended"
              ? "You haven't defended any stakes yet. Win challenges on LeetCode to build your defense wall!"
              : "No capital lost! Your honor is untarnished."}
          </p>
          <a
            href="https://leetcode.com/problems/two-sum"
            target="_blank"
            rel="noreferrer"
            className="nb-btn nb-btn-primary py-3 px-6 text-sm font-black uppercase tracking-wider inline-block shadow-[3px_3px_0_0_#000]"
          >
            Start on LeetCode ↗
          </a>
        </div>
      ) : (
        <>
          <div className="divide-y-4 divide-black">
            {visibleItems.map((item) => {
              const isDefended = item.category === "defended";

              return (
                <div
                  key={item.id}
                  className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start sm:items-center gap-3">
                    <span className={`text-2xl p-2 border-2 border-black shadow-[2px_2px_0_0_#000] shrink-0 ${
                      isDefended ? 'bg-[#00ff66]/20' : 'bg-[#ff3333]/15'
                    }`}>
                      {item.icon}
                    </span>

                    <div className="flex flex-col">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-base font-black text-black uppercase tracking-tight">
                          {item.label}
                        </span>
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 border border-black ${item.badgeBg} ${item.badgeText}`}>
                          {item.tag}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 mt-1 text-xs text-gray-600 font-bold flex-wrap">
                        <span className="text-black bg-gray-100 px-1.5 py-0.5 border border-black text-[10px] uppercase font-mono">
                          {item.detail}
                        </span>
                        <span>•</span>
                        <span>{formatDate(item.created_at)}</span>
                      </div>
                    </div>
                  </div>

                  <div
                    className={`font-mono font-black text-2xl text-right p-2.5 px-4 border-4 border-black shadow-[inset_2px_2px_0_0_#000] shrink-0 min-w-[140px] flex flex-col items-end ${
                      isDefended
                        ? "bg-[#00ff66]/20 text-[#00aa44]"
                        : "bg-[#ff3333]/15 text-[#ff3333]"
                    }`}
                  >
                    <span>
                      {isDefended ? "" : "-"}${Math.abs(item.amount_cents / 100).toFixed(2)}
                    </span>
                    <span className="text-[9px] font-sans font-black uppercase tracking-wider opacity-85">
                      {isDefended ? "Protected" : "Penalty"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Load More Button */}
          {hasMore && (
            <div className="p-4 bg-gray-50 border-t-4 border-black text-center">
              <button
                onClick={() => setVisibleCount((prev) => prev + 10)}
                className="nb-btn bg-white hover:bg-[#ffcc00] text-black px-6 py-2.5 text-xs font-black uppercase tracking-widest border-2 border-black shadow-[3px_3px_0_0_#000] active:translate-x-0.5 active:translate-y-0.5 transition cursor-pointer"
              >
                Load More Battles ({filteredItems.length - visibleCount} Remaining) ↓
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
