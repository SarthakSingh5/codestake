import type { UIState, ChallengeContract } from '../types';
import { LiveCountdownBadge } from './LiveCountdownBadge';

interface Props {
  activeSessionMode?: string;
  timerString?: string;
  activeSessionId?: string | null;
  gauntletContract?: ChallengeContract | null;
  bloodPactContract?: ChallengeContract | null;
  setUiState: (state: UIState) => void;
}

export function ActiveTracker({
  activeSessionMode,
  timerString,
  activeSessionId,
  gauntletContract,
  bloodPactContract,
  setUiState,
}: Props) {
  const hasQuickPlay = Boolean(activeSessionId);
  const hasGauntlet = Boolean(gauntletContract);
  const hasBloodPact = Boolean(bloodPactContract);

  // If nothing is active, return null
  if (!hasQuickPlay && !hasGauntlet && !hasBloodPact) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-[99999] font-sans animate-in fade-in slide-in-from-bottom-2 duration-200">
      <div className="flex flex-wrap items-center gap-2 bg-white border-3 border-black px-3 py-1.5 shadow-[3px_3px_0_0_#000] select-none max-w-[95vw]">
        {/* Live Pulse Indicator */}
        <span className="w-2.5 h-2.5 rounded-full border border-black bg-[#ff3333] animate-pulse shrink-0" />

        {/* ── 1. QUICK PLAY TIMER (Live) ── */}
        {hasQuickPlay && (
          <div className="flex items-center gap-1.5 bg-[#f8f8f8] px-2 py-0.5 border border-black shadow-[1px_1px_0_0_#000] shrink-0">
            <span className="text-[10px] font-black uppercase text-black">⚡ QP:</span>
            {activeSessionMode === 'time_crunch' ? (
              <span className="font-mono font-black text-xs text-[#ff3333] tabular-nums">
                ⏱️ {timerString || '00:00'}
              </span>
            ) : (
              <span className="text-[9px] font-black uppercase bg-black text-white px-1">
                1-SHOT
              </span>
            )}
            <span className="text-[8px] font-black uppercase bg-black text-white px-1 py-0.2">
              {activeSessionMode === 'time_crunch' ? 'CRUNCH' : 'STAKE'}
            </span>
          </div>
        )}

        {/* ── 2. GAUNTLET TIMER & PROGRESS (Live, Direct in Pill) ── */}
        {hasGauntlet && gauntletContract && (
          <div className="flex items-center gap-1.5 bg-[#fff9e6] px-2 py-0.5 border border-black shadow-[1px_1px_0_0_#000] shrink-0">
            <span className="text-[10px] font-black uppercase text-black">🔥 GAUNTLET:</span>
            <LiveCountdownBadge
              expiresAt={gauntletContract.expires_at}
              style="digital"
              prefix="⏱️ "
              className="text-xs text-[#ff3333] font-black"
            />
            <span className="text-[9px] font-mono font-black bg-black text-white px-1 py-0.2">
              {gauntletContract.total_problems_solved || 0}/{gauntletContract.target_problems_per_day} SOLVED
            </span>
          </div>
        )}

        {/* ── 3. BLOOD PACT TIMER & PROGRESS (Live, Direct in Pill) ── */}
        {hasBloodPact && bloodPactContract && (
          <div
            className={`flex items-center gap-1.5 px-2 py-0.5 border border-black shadow-[1px_1px_0_0_#000] shrink-0 ${
              bloodPactContract.problems_solved_today >= bloodPactContract.target_problems_per_day
                ? 'bg-emerald-50'
                : 'bg-red-50'
            }`}
          >
            <span className="text-[10px] font-black uppercase text-black">🩸 PACT:</span>
            {bloodPactContract.problems_solved_today >= bloodPactContract.target_problems_per_day ? (
              <span className="text-[9px] font-black text-[#00aa33] uppercase">
                SAFE TODAY ({bloodPactContract.problems_solved_today}/{bloodPactContract.target_problems_per_day})
              </span>
            ) : (
              <>
                <LiveCountdownBadge
                  expiresAt={bloodPactContract.expires_at}
                  style="digital"
                  prefix="⏰ "
                  className="text-xs text-[#ff3333] font-black"
                />
                <span className="text-[9px] font-mono font-black bg-black text-white px-1 py-0.2">
                  {bloodPactContract.problems_solved_today || 0}/{bloodPactContract.target_problems_per_day}
                </span>
              </>
            )}
          </div>
        )}

        <div className="h-4 w-[1px] bg-black/30 mx-0.5 shrink-0" />

        {/* Open Full CodeStake Dashboard / Active Pacts Modal */}
        <button
          onClick={() => setUiState('MODAL')}
          className="text-black hover:bg-[#00ff66] border border-black p-1 transition shadow-[1px_1px_0_0_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none shrink-0"
          title="Open CodeStake Modal & Active Pacts"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {/* Hide HUD */}
        <button
          onClick={() => setUiState('HIDDEN')}
          className="text-black hover:bg-[#ff3333] hover:text-white border border-black p-1 transition shadow-[1px_1px_0_0_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none shrink-0"
          title="Hide HUD (Click extension icon in toolbar to restore)"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
