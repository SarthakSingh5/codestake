import type { UIState } from '../types';

interface Props {
  setUiState: (state: UIState) => void;
}

export function Unauthenticated({ setUiState }: Props) {
  return (
    <div className="fixed bottom-6 right-6 z-[99999] flex items-end gap-3 font-sans">
      <div className="bg-[#0b0f1e] border border-red-500/30 p-4 rounded-xl shadow-[0_0_20px_rgba(220,38,38,0.2)] text-white w-64 animate-in fade-in slide-in-from-bottom-4 duration-300 relative">
        <button
          onClick={() => setUiState('HIDDEN')}
          className="absolute top-2 right-2 text-slate-500 hover:text-white transition"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>
        <h3 className="text-sm font-bold text-slate-200 mb-1">CodeStake Setup</h3>
        <p className="text-xs text-slate-400 mb-3">Please link your account to start betting.</p>
        <button
          onClick={() => {
            window.open("http://localhost:3000/extension", "_blank");
          }}
          className="w-full bg-slate-100 hover:bg-white text-black font-bold py-1.5 rounded text-sm transition"
        >
          Connect Account
        </button>
      </div>
    </div>
  );
}
