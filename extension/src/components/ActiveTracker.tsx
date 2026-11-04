import { useState } from 'react';
import type { UIState } from '../types';

interface Props {
  activeSessionMode: string;
  timerString: string;
  setUiState: (state: UIState) => void;
}

export function ActiveTracker({ activeSessionMode, timerString, setUiState }: Props) {
  // Start compact (mini-HUD) by default so it never blocks LeetCode's Run/Submit or Testcase panel
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  // ── 1. COMPACT MINI-HUD PILL (Non-intrusive, ~38px high) ──
  if (!isExpanded) {
    return (
      <div className="fixed bottom-4 right-4 z-[99999] font-sans animate-in fade-in slide-in-from-bottom-2 duration-200">
        <div className="flex items-center gap-2 bg-white border-3 border-black px-3 py-1.5 shadow-[3px_3px_0_0_#000] select-none">
          {/* Live Pulse Indicator */}
          <span className="w-2.5 h-2.5 rounded-full border border-black bg-[#ff3333] animate-pulse shrink-0" />

          {/* Time Countdown (if time_crunch) */}
          {activeSessionMode === 'time_crunch' ? (
            <div className="flex items-center gap-1 font-mono font-black text-sm text-[#ff3333] tabular-nums shrink-0">
              <span className="text-black text-xs">⏱️</span>
              <span>{timerString || '00:00'}</span>
            </div>
          ) : (
            <span className="text-[11px] font-black uppercase text-black tracking-wider shrink-0">
              🎯 ONE SHOT
            </span>
          )}

          {/* Mode Pill Badge */}
          <span className="text-[9px] font-black uppercase bg-black text-white px-1.5 py-0.5 shrink-0">
            {activeSessionMode === 'time_crunch' ? 'CRUNCH' : 'STAKE'}
          </span>

          <div className="h-4 w-[1px] bg-black/20 mx-0.5" />

          {/* Open Full CodeStake Dashboard / Active Pacts Modal */}
          <button
            onClick={() => setUiState('MODAL')}
            className="text-black hover:bg-[#00ff66] border border-black p-1 transition shadow-[1px_1px_0_0_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
            title="Open CodeStake Dashboard & All Active Pacts"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {/* Expand Details Toggle */}
          <button
            onClick={() => setIsExpanded(true)}
            className="text-black hover:bg-[#ffcc00] border border-black p-1 transition shadow-[1px_1px_0_0_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
            title="Expand Tracker Card"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
            </svg>
          </button>

          {/* Hide/Dismiss */}
          <button
            onClick={() => setUiState('HIDDEN')}
            className="text-black hover:bg-[#ff3333] hover:text-white border border-black p-1 transition shadow-[1px_1px_0_0_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
            title="Hide Tracker (Click extension icon in toolbar to restore)"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  // ── 2. EXPANDED TRACKER CARD ──
  return (
    <div className="fixed bottom-4 right-4 z-[99999] flex items-end gap-3 font-sans animate-in fade-in slide-in-from-bottom-3 duration-200">
      <div className="nb-box bg-white p-4 w-68 relative border-4 border-black shadow-[4px_4px_0_0_#000]">
        <div className="absolute top-0 left-0 w-full h-2 bg-[#ff3333] border-b-4 border-black" />
        
        <div className="flex justify-between items-center mb-2.5 mt-1">
          <h3 className="text-xs font-black text-black uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 border-2 border-black bg-[#ff3333] animate-pulse" />
            Active Session
          </h3>
          <div className="flex items-center gap-1">
            {/* Collapse to Mini-HUD */}
            <button
              onClick={() => setIsExpanded(false)}
              className="text-black hover:bg-[#ffcc00] border-2 border-black p-0.5 transition shadow-[1px_1px_0_0_#000]"
              title="Collapse to compact HUD pill"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </button>
            {/* Hide panel */}
            <button
              onClick={() => setUiState('HIDDEN')}
              className="text-black hover:bg-[#ff3333] hover:text-white border-2 border-black p-0.5 transition shadow-[1px_1px_0_0_#000]"
              title="Hide panel (Click extension icon to restore)"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="bg-[#f8f8f8] p-2.5 border-3 border-black mb-2 shadow-[2px_2px_0_0_#000]">
          <div className="flex justify-between text-[11px] text-black font-bold mb-1 border-b-2 border-black pb-1">
            <span className="uppercase">Mode</span>
            <span className="bg-black text-white px-1.5 py-0.2 text-[10px]">
              {activeSessionMode === 'one_shot' ? 'One Shot' : 'Time Crunch'}
            </span>
          </div>
          {activeSessionMode === 'time_crunch' && (
            <div className="flex justify-between items-center mt-1.5">
              <span className="text-[11px] text-black font-black uppercase">Time Left</span>
              <span className="text-lg font-mono font-black text-[#ff3333] font-tabular-nums">{timerString}</span>
            </div>
          )}
        </div>

        <button
          onClick={() => setUiState('MODAL')}
          className="nb-btn w-full py-1.5 text-[11px] font-black uppercase tracking-wider bg-[#00ff66] hover:bg-[#00e65c] text-black border-2 border-black mb-2 shadow-[2px_2px_0_0_#000]"
        >
          View All Active Pacts ↗
        </button>

        <p className="text-[9px] font-bold text-black text-center uppercase tracking-wider bg-[#ffcc00] border-2 border-black py-0.5">
          Money is on the line. Do not give up.
        </p>
      </div>
    </div>
  );
}
