import { useState, useEffect } from 'react';
import type { UIState, ChallengeContract } from '../types';
import { getDialogue } from '../lib/PersonalityDialogues';

interface Props {
  userId: string;
  uiState: UIState;
  setUiState: (state: UIState) => void;
  setActiveSessionId: (id: string | null) => void;
  setActiveSessionMode: (mode: string) => void;
  setTimerEndMs: (ms: number | null) => void;
}

type DashboardView = 'active_sessions' | 'main' | 'quick_play' | 'blood_pact' | 'gauntlet';

export function BettingModal({ userId, uiState, setUiState, setActiveSessionId, setActiveSessionMode, setTimerEndMs }: Props) {
  const [view, setView] = useState<DashboardView>('main');
  const [activeSessions, setActiveSessions] = useState<any[]>([]);

  // Quick Play State
  const [stakeAmount, setStakeAmount] = useState<number>(500);
  const [stakeMode, setStakeMode] = useState<string>("time_crunch");
  const [timerDuration, setTimerDuration] = useState<number>(30);

  // Blood Pact State
  const [pactDays, setPactDays] = useState<number>(7);
  const [pactProblems, setPactProblems] = useState<number>(1);
  const [pactPenalty, setPactPenalty] = useState<number>(5000);

  // Gauntlet State
  const [gauntletProblems, setGauntletProblems] = useState<number>(5);
  const [gauntletMinutes, setGauntletMinutes] = useState<number>(180);

  // Global State
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [personaScore, setPersonaScore] = useState<number>(0);
  const [activeContract, setActiveContract] = useState<ChallengeContract | null>(null);
  const [isCommitting, setIsCommitting] = useState(false);

  useEffect(() => {
    if (uiState === 'MODAL' && userId) {
      // Fetch Active Contract (which triggers Lazy Evaluation sweep in backend)
      chrome.runtime.sendMessage(
        { action: 'fetch_api', url: `http://localhost:3000/api/extension/contracts?userId=${userId}` },
        (contractRes) => {
          if (contractRes?.data?.contract) {
            setActiveContract(contractRes.data.contract);
          } else {
            setActiveContract(null);
          }

          // Now fetch Wallet (guarantees sweep debt is reflected)
          chrome.runtime.sendMessage(
            { action: 'fetch_api', url: `http://localhost:3000/api/extension/wallet?userId=${userId}` },
            (walletRes) => {
              if (walletRes?.data?.balanceCents !== undefined) {
                setWalletBalance(walletRes.data.balanceCents);
                setPersonaScore(walletRes.data.personaScore || 0);
              }
            }
          );
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
          <button
            onClick={() => setUiState('MINIMIZED')}
            className="absolute top-4 right-4 text-slate-500 hover:text-red-500 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <h2 className="text-2xl font-bold text-red-500 mb-2 uppercase tracking-wider">THE PACT IS BROKEN</h2>
          <p className="text-slate-300 text-sm mb-6 leading-relaxed">
            "{getDialogue(personaScore, 'loss')}"
          </p>
          <button onClick={() => window.open("http://localhost:3000/wallet", "_blank")} className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-3 px-4 rounded-lg transition shadow-[0_0_15px_rgba(220,38,38,0.4)] mb-3 uppercase tracking-wider">
            RESTORE HONOR (${(Math.abs(walletBalance) / 100).toFixed(2)})
          </button>
          <button onClick={() => setUiState('MINIMIZED')} className="text-slate-500 hover:text-red-500 text-xs font-bold uppercase tracking-widest underline transition-colors">
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
            targetProblemsPerDay: mode === 'blood_pact' ? pactProblems : gauntletProblems,
            durationMinutes: mode === 'gauntlet' ? gauntletMinutes : undefined,
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
        <button
          onClick={() => setUiState('MINIMIZED')}
          className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors z-50"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Top Tab Bar Navigation */}
        {(view === 'main' || view === 'active_sessions') && (
          <div className="flex bg-white/5 p-1 rounded-lg mb-6">
            <button
              onClick={() => setView('main')}
              className={`flex-1 py-2 text-xs font-bold uppercase tracking-widest rounded transition ${view === 'main' ? 'bg-[#0b0f1e] text-white shadow shadow-emerald-500/10' : 'text-slate-500 hover:text-slate-300'}`}
            >
              Forge Pact
            </button>
            <button
              onClick={() => {
                setView('active_sessions');
                chrome.runtime.sendMessage(
                  { action: 'fetch_api', url: `http://localhost:3000/api/extension/sessions?userId=${userId}&t=${Date.now()}` },
                  (res) => {
                    if (res?.data?.sessions) setActiveSessions(res.data.sessions);
                  }
                );
              }}
              className={`flex-1 py-2 text-xs font-bold uppercase tracking-widest rounded transition ${view === 'active_sessions' ? 'bg-[#0b0f1e] text-indigo-400 shadow shadow-indigo-500/10' : 'text-slate-500 hover:text-slate-300'}`}
            >
              Active Pacts
            </button>
          </div>
        )}

        {view === 'active_sessions' && (
          <div>

            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
              {activeSessions.length === 0 ? (
                <div className="text-center p-6 border border-white/5 rounded-xl bg-white/[0.02]">
                  <p className="text-slate-500 italic">You have no active pacts.</p>
                </div>
              ) : (
                activeSessions.filter(s => s.problems !== null).map(session => {
                  const url = session.problems.platform === "leetcode"
                    ? `https://leetcode.com/problems/${session.problems.slug}`
                    : "#";
                    
                  return (
                    <a
                      key={session.id}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-indigo-500/50 transition-all group"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="text-white font-bold text-sm group-hover:text-indigo-400 transition-colors truncate pr-4">
                          {session.problems.title}
                        </h3>
                        <span className="text-xs font-mono text-emerald-400 font-bold whitespace-nowrap">
                          ${(session.amount_cents / 100).toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-xs text-slate-500 uppercase font-semibold">
                        <span>{session.problems.platform}</span>
                        <span>{session.mode === 'one_shot' ? '🎯 One Shot' : '⏱️ Time Crunch'}</span>
                      </div>
                    </a>
                  );
                })
              )}
            </div>
          </div>
        )}

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
                <div className="flex gap-4 items-center w-2/3">
                  <input type="range" min="100" max="10000" step="100" value={stakeAmount} onChange={(e) => setStakeAmount(Number(e.target.value))} className="w-full accent-emerald-500 bg-black/50 rounded-lg appearance-none cursor-pointer h-2" />
                  <div className="relative flex items-center justify-end w-24">
                    <span className="absolute left-2 text-emerald-500 text-xs">$</span>
                    <input type="number" min="1" value={stakeAmount / 100} onChange={(e) => setStakeAmount(Math.max(1, Number(e.target.value)) * 100)} className="bg-black/50 border border-white/10 focus:border-emerald-500/50 rounded pl-5 pr-2 py-1 text-emerald-400 font-mono font-bold outline-none w-full text-right transition" />
                  </div>
                </div>
              </div>
              <div className="flex justify-between items-center text-sm pt-2 border-t border-white/5">
                <span className="text-slate-400">Mode:</span>
                <div className="flex gap-2 items-center">
                  <button onClick={() => setStakeMode("time_crunch")} className={`px-2 py-1 rounded text-xs transition ${stakeMode === "time_crunch" ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50' : 'bg-black/50 text-slate-400 border border-white/10 hover:border-white/30'}`}>⏱️ Time Crunch</button>
                  <button onClick={() => setStakeMode("one_shot")} className={`px-2 py-1 rounded text-xs transition ${stakeMode === "one_shot" ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50' : 'bg-black/50 text-slate-400 border border-white/10 hover:border-white/30'}`}>🎯 One Shot</button>
                </div>
              </div>
              {stakeMode === "time_crunch" && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-400">Timer:</span>
                  <div className="flex gap-4 items-center w-2/3">
                    <input type="range" min="5" max="180" step="5" value={timerDuration} onChange={(e) => setTimerDuration(Number(e.target.value))} className="w-full accent-emerald-500 bg-black/50 rounded-lg appearance-none cursor-pointer h-2" />
                    <div className="flex flex-col items-end w-24">
                      <div className="relative w-full">
                        <input type="number" min="5" step="5" value={timerDuration} onChange={(e) => setTimerDuration(Math.max(1, Number(e.target.value)))} className="bg-black/50 border border-white/10 focus:border-emerald-500/50 rounded pl-2 pr-5 py-1 text-emerald-400 font-mono font-bold outline-none w-full text-right transition" />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-emerald-500/70 text-xs">m</span>
                      </div>
                      {timerDuration >= 60 && <span className="text-[10px] text-slate-500 mt-1">({Math.floor(timerDuration / 60)}h {timerDuration % 60 > 0 ? `${timerDuration % 60}m` : ''})</span>}
                    </div>
                  </div>
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
                <span className="text-slate-400">Length:</span>
                <div className="flex gap-4 items-center w-2/3">
                  <input type="range" min="1" max="100" step="1" value={pactDays} onChange={(e) => setPactDays(Number(e.target.value))} className="w-full accent-red-500 bg-black/50 rounded-lg appearance-none cursor-pointer h-2" />
                  <div className="flex flex-col items-end w-24">
                    <div className="relative w-full">
                      <input type="number" min="1" value={pactDays} onChange={(e) => setPactDays(Math.max(1, Number(e.target.value)))} className="bg-black/50 border border-white/10 focus:border-red-500/50 rounded pl-2 pr-5 py-1 text-red-400 font-mono font-bold outline-none w-full text-right transition" />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-red-500/70 text-xs">d</span>
                    </div>
                    {pactDays >= 30 && <span className="text-[10px] text-slate-500 mt-1">(~{(pactDays / 30).toFixed(1)}m)</span>}
                  </div>
                </div>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-400">Daily Quota:</span>
                <div className="flex items-center gap-3 bg-black/50 rounded-lg border border-white/10 p-1">
                  <button onClick={() => setPactProblems(Math.max(1, pactProblems - 1))} className="w-6 h-6 rounded bg-white/5 hover:bg-white/20 text-slate-400 hover:text-white flex items-center justify-center transition">-</button>
                  <span className="text-red-400 font-mono font-bold w-4 text-center">{pactProblems}</span>
                  <button onClick={() => setPactProblems(Math.min(10, pactProblems + 1))} className="w-6 h-6 rounded bg-white/5 hover:bg-white/20 text-slate-400 hover:text-white flex items-center justify-center transition">+</button>
                </div>
              </div>
              <div className="flex justify-between items-center text-sm pt-2 border-t border-white/5">
                <span className="text-red-400 font-bold">Failure Penalty:</span>
                <div className="flex gap-4 items-center w-2/3">
                  <input type="range" min="500" max="50000" step="500" value={pactPenalty} onChange={(e) => setPactPenalty(Number(e.target.value))} className="w-full accent-red-500 bg-black/50 rounded-lg appearance-none cursor-pointer h-2" />
                  <div className="relative flex items-center justify-end w-24">
                    <span className="absolute left-2 text-red-500 text-xs">$</span>
                    <input type="number" min="5" value={pactPenalty / 100} onChange={(e) => setPactPenalty(Math.max(1, Number(e.target.value)) * 100)} className="bg-black/50 border border-red-500/30 focus:border-red-500 rounded pl-5 pr-2 py-1 text-red-400 font-mono font-bold outline-none w-full text-right transition" />
                  </div>
                </div>
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
                <span className="text-slate-400">Target Problems:</span>
                <div className="flex items-center gap-3 bg-black/50 rounded-lg border border-white/10 p-1">
                  <button onClick={() => setGauntletProblems(Math.max(1, gauntletProblems - 1))} className="w-6 h-6 rounded bg-white/5 hover:bg-white/20 text-slate-400 hover:text-white flex items-center justify-center transition">-</button>
                  <span className="text-orange-400 font-mono font-bold w-4 text-center">{gauntletProblems}</span>
                  <button onClick={() => setGauntletProblems(Math.min(20, gauntletProblems + 1))} className="w-6 h-6 rounded bg-white/5 hover:bg-white/20 text-slate-400 hover:text-white flex items-center justify-center transition">+</button>
                </div>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-400">Time Limit:</span>
                <div className="flex gap-4 items-center w-2/3">
                  <input type="range" min="30" max="300" step="30" value={gauntletMinutes} onChange={(e) => setGauntletMinutes(Number(e.target.value))} className="w-full accent-orange-500 bg-black/50 rounded-lg appearance-none cursor-pointer h-2" />
                  <div className="flex flex-col items-end w-24">
                    <div className="relative w-full">
                      <input type="number" min="30" step="30" value={gauntletMinutes} onChange={(e) => setGauntletMinutes(Math.max(1, Number(e.target.value)))} className="bg-black/50 border border-white/10 focus:border-orange-500/50 rounded pl-2 pr-5 py-1 text-orange-400 font-mono font-bold outline-none w-full text-right transition" />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-orange-500/70 text-xs">m</span>
                    </div>
                    {gauntletMinutes >= 60 && <span className="text-[10px] text-slate-500 mt-1">({Math.floor(gauntletMinutes / 60)}h {gauntletMinutes % 60 > 0 ? `${gauntletMinutes % 60}m` : ''})</span>}
                  </div>
                </div>
              </div>
              <div className="flex justify-between items-center text-sm pt-2 border-t border-white/5">
                <span className="text-orange-400 font-bold">Failure Penalty:</span>
                <div className="flex gap-4 items-center w-2/3">
                  <input type="range" min="500" max="50000" step="500" value={pactPenalty} onChange={(e) => setPactPenalty(Number(e.target.value))} className="w-full accent-orange-500 bg-black/50 rounded-lg appearance-none cursor-pointer h-2" />
                  <div className="relative flex items-center justify-end w-24">
                    <span className="absolute left-2 text-orange-500 text-xs">$</span>
                    <input type="number" min="5" value={pactPenalty / 100} onChange={(e) => setPactPenalty(Math.max(1, Number(e.target.value)) * 100)} className="bg-black/50 border border-orange-500/30 focus:border-orange-500 rounded pl-5 pr-2 py-1 text-orange-400 font-mono font-bold outline-none w-full text-right transition" />
                  </div>
                </div>
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
