import type { UIState } from '../types';

interface Props {
  activeSessionMode: string;
  timerString: string;
  setUiState: (state: UIState) => void;
}

export function ActiveTracker({ activeSessionMode, timerString, setUiState }: Props) {
  return (
    <div className="fixed bottom-6 right-6 z-[99999] flex items-end gap-3 font-sans">
      <div className="nb-box bg-white p-4 w-64 animate-in fade-in slide-in-from-bottom-4 duration-300 relative border-4 border-black shadow-[4px_4px_0_0_#000]">
        <div className="absolute top-0 left-0 w-full h-2 bg-[#ff3333] border-b-4 border-black" />
        <div className="flex justify-between items-start mb-2 mt-2">
          <h3 className="text-sm font-black text-black uppercase tracking-widest flex items-center gap-2">
            <span className="w-3 h-3 border-2 border-black bg-[#ff3333] animate-pulse" />
            Active Session
          </h3>
          <button
            onClick={() => setUiState('HIDDEN')}
            className="text-black hover:bg-[#ffcc00] border-2 border-transparent hover:border-black p-0.5 transition"
            title="Hide panel (won't cancel bet)"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>

        <div className="bg-[#f8f8f8] p-3 border-4 border-black mb-2 shadow-[2px_2px_0_0_#000]">
          <div className="flex justify-between text-xs text-black font-bold mb-1 border-b-2 border-black pb-1">
            <span className="uppercase">Mode</span>
            <span className="bg-black text-white px-1">{activeSessionMode === 'one_shot' ? 'One Shot' : 'Time Crunch'}</span>
          </div>
          {activeSessionMode === 'time_crunch' && (
            <div className="flex justify-between items-center mt-2">
              <span className="text-xs text-black font-black uppercase">Time Left</span>
              <span className="text-xl font-mono font-black text-[#ff3333] font-tabular-nums">{timerString}</span>
            </div>
          )}
        </div>
        <p className="text-[10px] font-bold text-black text-center uppercase tracking-wider bg-[#ffcc00] border-2 border-black py-1">
          Money is on the line. Do not give up.
        </p>
      </div>
    </div>
  );
}
