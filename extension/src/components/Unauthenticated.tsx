import type { UIState } from '../types';

interface Props {
  setUiState: (state: UIState) => void;
}

export function Unauthenticated({ setUiState }: Props) {
  return (
    <div className="fixed bottom-6 right-6 z-[99999] flex items-end gap-3 font-sans">
      <div className="nb-box bg-white p-4 w-64 animate-in fade-in slide-in-from-bottom-4 duration-300 relative border-4 border-black shadow-[4px_4px_0_0_#000]">
        <div className="absolute top-0 left-0 w-full h-2 bg-[#ffcc00] border-b-4 border-black" />
        <button
          onClick={() => setUiState('HIDDEN')}
          className="absolute top-4 right-4 text-black hover:bg-[#ff3333] border-2 border-transparent hover:border-black p-0.5 transition"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>
        <h3 className="text-sm font-black text-black uppercase tracking-widest mt-2 mb-1">CodeStake Setup</h3>
        <p className="text-xs font-bold text-black/70 mb-4 bg-gray-100 p-1 border-2 border-black">Please link your account to start betting.</p>
        <button
          onClick={() => {
            window.open("http://localhost:3000/extension", "_blank");
          }}
          className="nb-btn nb-btn-primary w-full py-2 text-sm"
        >
          Connect Account
        </button>
      </div>
    </div>
  );
}
