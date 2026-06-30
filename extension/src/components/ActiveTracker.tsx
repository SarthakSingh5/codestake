import type { UIState } from '../types';

interface Props {
  activeSessionMode: string;
  timerString: string;
  setUiState: (state: UIState) => void;
}

export function ActiveTracker({ activeSessionMode, timerString, setUiState }: Props) {
  return (
    <div className="fixed bottom-6 right-6 z-[99999] flex items-end gap-3 font-sans">
      <div className="bg-[#0b0f1e] border border-red-500/80 p-4 rounded-xl shadow-[0_0_20px_rgba(220,38,38,0.4)] text-white w-64 animate-in fade-in slide-in-from-bottom-4 duration-300 relative">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-sm font-bold text-red-500 animate-pulse flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
            Active Session
          </h3>
          <button
            onClick={() => setUiState('HIDDEN')}
            className="text-slate-500 hover:text-white transition"
            title="Hide panel (won't cancel bet)"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>

        <div className="bg-black/50 rounded-lg p-3 border border-red-500/30 mb-2">
          <div className="flex justify-between text-xs text-slate-400 mb-1">
            <span>Mode</span>
            <span className="text-white font-mono">{activeSessionMode === 'one_shot' ? '🎯 One Shot' : '⏱️ Time Crunch'}</span>
          </div>
          {activeSessionMode === 'time_crunch' && (
            <div className="flex justify-between items-center mt-2">
              <span className="text-xs text-slate-400">Time Left</span>
              <span className="text-xl font-mono font-bold text-red-400 font-tabular-nums">{timerString}</span>
            </div>
          )}
        </div>
        <p className="text-[10px] text-slate-500 text-center uppercase tracking-wider">
          Money is on the line. Do not give up.
        </p>
      </div>
    </div>
  );
}
