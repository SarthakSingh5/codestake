import type { UIState } from '../types';

interface Props {
  uiState: UIState;
  setUiState: (state: UIState) => void;
}

export function NotificationBubble({ uiState, setUiState }: Props) {
  return (
    <div className="fixed bottom-6 right-6 z-[99999] flex items-end gap-3 font-sans">
      {uiState === 'NOTIFICATION' && (
        <div className="bg-[#0b0f1e] border border-red-500/30 p-4 rounded-xl shadow-[0_0_20px_rgba(220,38,38,0.2)] text-white w-64 animate-in fade-in slide-in-from-bottom-4 duration-300 relative">
          <button
            onClick={() => setUiState('MINIMIZED')}
            className="absolute top-2 right-2 text-slate-500 hover:text-white transition"
            title="Close notification"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
          <h3 className="text-sm font-bold text-slate-200 mb-1">Want to spice things up?</h3>
          <p className="text-xs text-slate-400 mb-3">Stake real money on this problem.</p>
          <button
            onClick={() => setUiState('MODAL')}
            className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-1.5 rounded text-sm transition shadow-[0_0_10px_rgba(220,38,38,0.4)]"
          >
            Put money on the table
          </button>
        </div>
      )}

      <div className="relative flex flex-col items-center">
        <button
          onClick={() => setUiState('HIDDEN')}
          className="absolute -top-2 -right-2 bg-slate-800 border border-slate-600 rounded-full p-0.5 text-slate-400 hover:text-white hover:bg-red-500 hover:border-red-500 transition z-10"
          title="Hide CodeStake (Click extension icon to restore)"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>
        <button
          onClick={() => setUiState('MODAL')}
          className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(220,38,38,0.6)] hover:scale-105 hover:bg-red-500 transition-all group relative"
        >
          <span className="absolute w-full h-full rounded-full border border-red-500 animate-ping opacity-75"></span>
          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
