import { useState, useEffect } from 'react';
import type { UIState, ChallengeContract } from '../types';

interface Props {
  userId: string;
  uiState: UIState;
  setUiState: (state: UIState) => void;
  setActiveSessionId: (id: string) => void;
  setActiveSessionMode: (mode: string) => void;
  setTimerEndMs: (ms: number) => void;
}

type DashboardView = 'main' | 'quick_play' | 'blood_pact' | 'gauntlet';

export function BettingModal({ userId, uiState, setUiState, setActiveSessionId, setActiveSessionMode, setTimerEndMs }: Props) {
  const [view, setView] = useState<DashboardView>('main');
  
  // Quick Play State
  const [stakeAmount, setStakeAmount] = useState<number>(500);
  const [stakeMode, setStakeMode] = useState<string>("time_crunch");
  const [timerDuration, setTimerDuration] = useState<number>(30);
  
  // Blood Pact State
  const [pactDays, setPactDays] = useState<number>(7);
  const [pactProblems, setPactProblems] = useState<number>(1);
  const [pactPenalty, setPactPenalty] = useState<number>(5000);

  // Global State
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [activeContract, setActiveContract] = useState<ChallengeContract | null>(null);
  const [isCommitting, setIsCommitting] = useState(false);

  useEffect(() => {
    if (uiState === 'MODAL' && userId) {
      // Fetch Wallet
      chrome.runtime.sendMessage(
        { action: 'fetch_api', url: `http://localhost:3000/api/extension/wallet?userId=${userId}` },
        (res) => {
          if (res?.data?.balanceCents !== undefined) setWalletBalance(res.data.balanceCents);
        }
      );
      // Fetch Active Contract
      chrome.runtime.sendMessage(
        { action: 'fetch_api', url: `http://localhost:3000/api/extension/contracts?userId=${userId}` },
        (res) => {
          if (res?.data?.contract) setActiveContract(res.data.contract);
        }
      );
    }
  }, [uiState, userId]);

  if (uiState !== 'MODAL') return null;

  if (walletBalance !== null && walletBalance < 0) {
    return (
      <div className="fixed inset-0 z-[99999] bg-black/60 backdrop-blur-sm flex items-center justify-center font-sans">
        <div className="bg-[#0b0f1e] border border-red-500/30 rounded-2xl p-8 max-w-md w-full shadow-2xl shadow-red-900/20 text-center relative overflow-hidden animate-in zoom-in-95 duration-200">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-600 to-orange-500" />
          <h2 className="text-2xl font-bold text-red-500 mb-2 uppercase tracking-wider">You lose</h2>
          <p className="text-slate-400 text-sm mb-6 uppercase tracking-widest">now please honor the code of omerta</p>
          <button onClick={() => window.open("http://localhost:3000/wallet", "_blank")} className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-3 px-4 rounded-lg transition shadow-[0_0_15px_rgba(220,38,38,0.4)] mb-3 uppercase tracking-wider">
            be a man of word
          </button>
          <button onClick={() => setUiState('HIDDEN')} className="text-slate-500 hover:text-red-500 text-xs font-bold uppercase tracking-widest underline transition-colors">
            i quit and will never come here again
          </button>
        </div>
      </div>
    );
  }

  const handleStartContract = async (mode: 'blood_pact' | 'gauntlet') => {
    setIsCommitting(true);
    chrome.runtime.sendMessage(
      {
        action: 'fetch_api',
        url: "http://localhost:3000/api/extension/contracts",
        options: {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId,
            mode,
            targetDays: mode === 'blood_pact' ? pactDays : 1,
            targetProblemsPerDay: mode === 'blood_pact' ? pactProblems : 5,
            penaltyCents: pactPenalty
          })
        }
      },
      (res) => {
        setIsCommitting(false);
        if (res?.data?.contract) {
          setActiveContract(res.data.contract);
          setView('main');
        } else {
          alert("Error creating contract.");
        }
      }
    );
  };

  const handleQuickPlay = async () => {
    const isProblemPage = window.location.pathname.includes("/problems/") && window.location.pathname.split("/")[2];
    if (!isProblemPage) {
      alert("You must be on a specific LeetCode problem page to start a Quick Play.");
      return;
    }
    
    setIsCommitting(true);
    const problemSlug = window.location.pathname.split("/")[2] || "unknown-problem";
    chrome.runtime.sendMessage(
      {
        action: 'fetch_api',
        url: "http://localhost:3000/api/extension/commit",
        options: {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, problemId: problemSlug, amountCents: stakeAmount, mode: stakeMode, durationMinutes: timerDuration })
        }
      },
      (res) => {
        setIsCommitting(false);
        if (res?.data?.session) {
          const newSessionId = res.data.session.id;
          chrome.runtime.sendMessage({ action: 'mark_session_active', sessionId: newSessionId });
          window.postMessage({ type: 'CODESTAKE_CLEAR_EDITOR' }, '*');
          setActiveSessionId(newSessionId);
          setActiveSessionMode(stakeMode);
          setTimerEndMs(stakeMode === 'time_crunch' ? Date.now() + timerDuration * 60000 : 0);
          setUiState('TRACKING');
        } else {
          alert("Error starting Quick Play.");
        }
      }
    );
  };

  // Wipes editor for active contracts without starting a Quick Play session
  const handleSolveForContract = () => {
    window.postMessage({ type: 'CODESTAKE_CLEAR_EDITOR' }, '*');
    setUiState('MINIMIZED');
    // Note: Interceptor handles the 'Accepted' verdict and sends to resolve API which increments contract progress.
  };

  return (
    <div className="fixed inset-0 z-[99999] bg-black/60 backdrop-blur-sm flex items-center justify-center font-sans">
      <div className="bg-[#0b0f1e] border border-emerald-500/30 rounded-2xl p-6 max-w-md w-full shadow-2xl shadow-emerald-900/20 relative overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-teal-400" />
        
        {view === 'main' && (
          <div className="text-center">
            <h2 className="text-2xl font-bold text-white mb-6 tracking-wide">COMMAND DASHBOARD</h2>
            
            {activeContract && (
              <div className="mb-6 p-4 rounded-xl border border-red-500/30 bg-red-950/20 text-left">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-red-400 font-bold uppercase tracking-widest text-xs">Active Macro-Stake</h3>
                  <span className="text-red-500 text-xs font-mono">${(activeContract.penalty_cents / 100).toFixed(2)} PENALTY</span>
                </div>
                <h4 className="text-white text-lg mb-1">{activeContract.mode === 'blood_pact' ? 'The Blood Pact' : 'The Gauntlet'}</h4>
                <div className="text-slate-400 text-sm mb-4">
                  {activeContract.mode === 'blood_pact' 
                    ? `Day ${activeContract.current_day} of ${activeContract.target_days}. Solved today: ${activeContract.problems_solved_today}/${activeContract.target_problems_per_day}`
                    : `Gauntlet: Solved ${activeContract.total_problems_solved}/${activeContract.target_problems_per_day}`
                  }
                </div>
                <button onClick={handleSolveForContract} className="w-full bg-red-600/20 hover:bg-red-600/40 text-red-400 border border-red-500/50 py-2 rounded transition text-sm font-bold tracking-wider">
                  SOLVE PROBLEM
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 gap-3">
              <button 
                onClick={() => {
                  const isProblemPage = window.location.pathname.includes("/problems/") && window.location.pathname.split("/")[2];
                  if (isProblemPage) setView('quick_play');
                }} 
                className={`p-4 rounded-xl transition text-left group ${(window.location.pathname.includes("/problems/") && window.location.pathname.split("/")[2]) ? "bg-emerald-950/30 border border-emerald-500/20 hover:border-emerald-500/60 hover:bg-emerald-900/40 text-white cursor-pointer" : "bg-slate-900/50 border border-slate-700/50 text-slate-500 cursor-not-allowed opacity-50"}`}
              >
                <div className={`font-bold mb-1 ${(window.location.pathname.includes("/problems/") && window.location.pathname.split("/")[2]) ? "text-emerald-400 group-hover:text-emerald-300" : "text-slate-500"}`}>
                  Quick Play {(window.location.pathname.includes("/problems/") && window.location.pathname.split("/")[2]) ? "" : "(Nav to problem first)"}
                </div>
                <div className="text-xs text-slate-400">Micro-stake on a single problem. Fast and brutal.</div>
              </button>
              
              {!activeContract && (
                <>
                  <button onClick={() => setView('blood_pact')} className="bg-white/5 border border-white/10 hover:border-red-500/50 hover:bg-red-950/20 text-white p-4 rounded-xl transition text-left group">
                    <div className="font-bold text-red-400 mb-1">The Blood Pact</div>
                    <div className="text-xs text-slate-400">Multi-day streak contract. Miss a day, owe a massive debt.</div>
                  </button>
                  <button onClick={() => setView('gauntlet')} className="bg-white/5 border border-white/10 hover:border-orange-500/50 hover:bg-orange-950/20 text-white p-4 rounded-xl transition text-left group">
                    <div className="font-bold text-orange-400 mb-1">The Gauntlet</div>
                    <div className="text-xs text-slate-400">Endurance mode. 5 problems back-to-back under a strict timer.</div>
                  </button>
                </>
              )}
            </div>
            <button onClick={() => setUiState('MINIMIZED')} className="mt-6 text-slate-500 hover:text-white text-xs uppercase tracking-widest transition">Close</button>
          </div>
        )}

        {view === 'quick_play' && (
          <div className="text-center">
            <h2 className="text-xl font-bold text-emerald-400 mb-4">Quick Play</h2>
            <div className="bg-white/5 rounded-xl p-4 mb-6 text-left space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-400">Your Stake:</span>
                <select value={stakeAmount} onChange={(e) => setStakeAmount(Number(e.target.value))} className="bg-black/50 border border-white/10 rounded px-2 py-1 text-white font-mono outline-none">
                  <option value={500}>$5.00</option><option value={1000}>$10.00</option><option value={2000}>$20.00</option>
                </select>
              </div>
              <div className="flex justify-between items-center text-sm pt-2 border-t border-white/5">
                <span className="text-slate-400">Mode:</span>
                <select value={stakeMode} onChange={(e) => setStakeMode(e.target.value)} className="bg-black/50 border border-white/10 rounded px-2 py-1 text-white text-xs outline-none">
                  <option value="time_crunch">⏱️ Time Crunch</option><option value="one_shot">🎯 One Shot</option>
                </select>
              </div>
              {stakeMode === "time_crunch" && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-400">Timer (mins):</span>
                  <input type="number" min="1" value={timerDuration} onChange={(e) => setTimerDuration(Number(e.target.value))} className="bg-black/50 border border-white/10 rounded px-2 py-1 text-white text-xs w-16 text-right" />
                </div>
              )}
            </div>
            <button onClick={handleQuickPlay} disabled={isCommitting} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-lg mb-3">{isCommitting ? "..." : "START STAKE"}</button>
            <button onClick={() => setView('main')} className="text-slate-400 text-sm underline">Back to Dashboard</button>
          </div>
        )}

        {view === 'blood_pact' && (
          <div className="text-center">
            <h2 className="text-xl font-bold text-red-500 mb-2">The Blood Pact</h2>
            <p className="text-xs text-slate-400 mb-6">If you miss your quota before midnight, you incur a massive debt penalty.</p>
            <div className="bg-white/5 rounded-xl p-4 mb-6 text-left space-y-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-400">Contract Length:</span>
                <select value={pactDays} onChange={(e) => setPactDays(Number(e.target.value))} className="bg-black/50 border border-white/10 rounded px-2 py-1 text-white text-xs">
                  <option value={7}>7 Days</option><option value={30}>30 Days</option><option value={100}>100 Days</option>
                </select>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-400">Daily Problems:</span>
                <select value={pactProblems} onChange={(e) => setPactProblems(Number(e.target.value))} className="bg-black/50 border border-white/10 rounded px-2 py-1 text-white text-xs">
                  <option value={1}>1 Problem</option><option value={3}>3 Problems</option><option value={5}>5 Problems</option>
                </select>
              </div>
              <div className="flex justify-between items-center text-sm pt-2 border-t border-white/5">
                <span className="text-red-400 font-bold">Failure Debt Penalty:</span>
                <select value={pactPenalty} onChange={(e) => setPactPenalty(Number(e.target.value))} className="bg-red-950/50 border border-red-500/30 rounded px-2 py-1 text-red-400 font-mono text-sm">
                  <option value={5000}>$50.00</option><option value={10000}>$100.00</option><option value={50000}>$500.00</option>
                </select>
              </div>
            </div>
            <button onClick={() => handleStartContract('blood_pact')} disabled={isCommitting} className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-3 rounded-lg mb-3 shadow-[0_0_15px_rgba(220,38,38,0.4)]">SEAL THE PACT</button>
            <button onClick={() => setView('main')} className="text-slate-400 text-sm underline">Back to Dashboard</button>
          </div>
        )}

        {view === 'gauntlet' && (
          <div className="text-center">
            <h2 className="text-xl font-bold text-orange-500 mb-2">The Gauntlet</h2>
            <p className="text-xs text-slate-400 mb-6">Complete 5 problems back-to-back in under 3 hours. No pauses.</p>
            <div className="bg-white/5 rounded-xl p-4 mb-6 text-left space-y-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-400">Target:</span>
                <span className="text-white">5 Problems</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-400">Time Limit:</span>
                <span className="text-white">3 Hours</span>
              </div>
              <div className="flex justify-between items-center text-sm pt-2 border-t border-white/5">
                <span className="text-orange-400 font-bold">Failure Debt Penalty:</span>
                <select value={pactPenalty} onChange={(e) => setPactPenalty(Number(e.target.value))} className="bg-orange-950/50 border border-orange-500/30 rounded px-2 py-1 text-orange-400 font-mono text-sm">
                  <option value={2000}>$20.00</option><option value={5000}>$50.00</option>
                </select>
              </div>
            </div>
            <button onClick={() => handleStartContract('gauntlet')} disabled={isCommitting} className="w-full bg-orange-600 hover:bg-orange-500 text-white font-bold py-3 rounded-lg mb-3 shadow-[0_0_15px_rgba(249,115,22,0.4)]">ENTER THE GAUNTLET</button>
            <button onClick={() => setView('main')} className="text-slate-400 text-sm underline">Back to Dashboard</button>
          </div>
        )}

      </div>
    </div>
  );
}
