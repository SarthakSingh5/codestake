import type { UIState } from '../types';

interface Props {
  uiState: UIState;
  setUiState: (state: UIState) => void;
  isAntiCheatActive?: boolean;
}

export function NotificationBubble({ uiState, setUiState, isAntiCheatActive }: Props) {
  return (
    <div className="fixed bottom-6 right-6 z-[99999] flex items-end gap-3 font-sans">
      {uiState === 'NOTIFICATION' && (
        <div className="nb-box bg-white p-4 w-72 animate-in fade-in slide-in-from-bottom-4 duration-300 relative border-4 border-black shadow-[6px_6px_0_0_#000]">
          <div className="absolute top-0 left-0 w-full h-2 bg-[#00ff66] border-b-4 border-black" />
          <button
            onClick={() => setUiState('MINIMIZED')}
            className="absolute top-3 right-3 text-black hover:bg-[#ff3333] border-2 border-transparent hover:border-black p-0.5 transition"
            title="Close notification"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <h3 className="text-sm font-black text-black uppercase tracking-wider mt-2 mb-1">
            Spice Things Up?
          </h3>
          <p className="text-xs font-bold text-black/80 mb-3 bg-gray-100 p-2 border-2 border-black">
            Stake real money on this problem.
          </p>
          <button
            onClick={() => setUiState('MODAL')}
            className="nb-btn nb-btn-primary w-full py-2 text-xs font-black uppercase tracking-wider"
          >
            Put money on the table
          </button>
        </div>
      )}

      <div className="flex flex-col items-end gap-1.5">
        {isAntiCheatActive && (
          <div className="bg-[#00ff66] text-black border-2 border-black text-[10px] font-black uppercase px-2 py-0.5 shadow-[2px_2px_0_0_#000] pointer-events-none whitespace-nowrap tracking-wide animate-in fade-in slide-in-from-bottom-2 duration-200">
            ⚡ STRICT
          </div>
        )}
        <div className="relative">
          <button
            onClick={() => setUiState('HIDDEN')}
            className="absolute -top-2.5 -right-2.5 bg-black border-2 border-black text-white hover:bg-[#ff3333] transition z-10 p-0.5 shadow-[2px_2px_0_0_#000]"
            title="Hide CodeStake (Click extension icon to restore)"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <button
            onClick={() => setUiState('MODAL')}
            className="w-12 h-12 bg-[#00ff66] border-4 border-black shadow-[4px_4px_0_0_#000] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_0_#000] active:translate-x-0 active:translate-y-0 active:shadow-none flex items-center justify-center transition-all group"
            title="Open CodeStake"
          >
            <svg className="w-6 h-6 text-black stroke-[3]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
