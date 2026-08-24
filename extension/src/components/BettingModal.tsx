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
  const [isBanned, setIsBanned] = useState<boolean>(false);
  const [activeContracts, setActiveContracts] = useState<ChallengeContract[]>([]);
  const [isCommitting, setIsCommitting] = useState(false);

  // Checkout State
  const [checkoutMode, setCheckoutMode] = useState<'none' | 'payment_options' | 'stripe'>('none');
  const [isStripeLoading, setIsStripeLoading] = useState(false);

  useEffect(() => {
    if (uiState === 'MODAL' && userId) {
      // Fetch Active Contracts (which triggers Lazy Evaluation sweep in backend)
      chrome.runtime.sendMessage(
        { action: 'fetch_api', url: `http://localhost:3000/api/extension/contracts?userId=${userId}&t=${Date.now()}` },
        (contractRes) => {
          if (contractRes?.data?.contracts) {
            setActiveContracts(contractRes.data.contracts);
          } else {
            setActiveContracts([]);
          }

          // Now fetch Wallet (guarantees sweep debt is reflected)
          chrome.runtime.sendMessage(
            { action: 'fetch_api', url: `http://localhost:3000/api/extension/wallet?userId=${userId}&t=${Date.now()}` },
            (walletRes) => {
              if (walletRes?.data?.balanceCents !== undefined) {
                setWalletBalance(walletRes.data.balanceCents);
                setPersonaScore(walletRes.data.personaScore || 0);
                if (walletRes.data.isBanned) {
                  setIsBanned(true);
                }
              }
            }
          );
        }
      );
    }
  }, [uiState, userId]);

  // Payment Polling & Iframe Message Listener
  useEffect(() => {
    let interval: any;
    if (walletBalance !== null && walletBalance < 0) {
      interval = setInterval(() => {
        chrome.runtime.sendMessage(
          { action: 'fetch_api', url: `http://localhost:3000/api/extension/wallet?userId=${userId}&t=${Date.now()}` },
          (walletRes) => {
            if (walletRes?.data?.balanceCents !== undefined) {
              setWalletBalance(walletRes.data.balanceCents);
              // If balance >= 0, the debt view will automatically unmount!
            }
          }
        );
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [walletBalance, checkoutMode, userId]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // In dev, origin is localhost. In prod, it should be the site URL.
      if (event.data?.type === 'CODESTAKE_PAYMENT_SUCCESS') {
        chrome.runtime.sendMessage(
          { action: 'fetch_api', url: `http://localhost:3000/api/extension/wallet?userId=${userId}&t=${Date.now()}` },
          (walletRes) => {
            if (walletRes?.data?.balanceCents !== undefined) {
              setWalletBalance(walletRes.data.balanceCents);
            }
          }
        );
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [userId]);

  if (uiState !== 'MODAL') return null;

  if (isBanned) {
    return (
      <div className="fixed inset-0 z-[99999] bg-black backdrop-blur-md flex items-center justify-center font-sans">
        <div className="bg-[#050505] border border-red-900/50 rounded-2xl p-12 max-w-md w-full shadow-[0_0_100px_rgba(153,27,27,0.3)] text-center relative overflow-hidden animate-in zoom-in-95 duration-1000">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1px] h-full bg-red-900/30" />
          <div className="absolute top-1/2 left-0 -translate-y-1/2 w-full h-[1px] bg-red-900/30" />

          <button
            onClick={() => setUiState('MINIMIZED')}
            className="absolute top-4 right-4 text-red-900/50 hover:text-red-500 transition-colors z-50"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <h2 className="relative z-10 text-4xl font-black text-red-800 mb-6 uppercase tracking-[0.3em] drop-shadow-[0_0_15px_rgba(220,38,38,0.3)]">
            EXILED
          </h2>
          <p className="relative z-10 text-slate-500 font-serif italic text-lg leading-relaxed mb-8">
            "You chose the coward's way out.<br />
            Your pact is broken.<br />
            You are permanently banished."
          </p>
          <div className="relative z-10 text-[10px] text-red-900/70 font-mono tracking-widest uppercase">
            NO RETURN.
          </div>
        </div>
      </div>
    );
  }

  const handlePermanentBan = () => {
    if (confirm("WARNING: This is permanent. You will be banned from CodeStake forever and locked out of your account. Do you accept the consequences?")) {
      chrome.runtime.sendMessage(
        {
          action: 'fetch_api',
          url: `http://localhost:3000/api/extension/ban`,
          options: {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId })
          }
        },
        () => {
          setIsBanned(true);
        }
      );
    }
  };

  const handleStripeCheckout = () => {
    setIsStripeLoading(true);
    chrome.runtime.sendMessage(
      {
        action: 'fetch_api',
        url: `http://localhost:3000/api/extension/checkout/stripe`,
        options: {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, amountCents: Math.abs(walletBalance!) })
        }
      },
      (res) => {
        setIsStripeLoading(false);
        if (res?.data?.url) {
          window.open(res.data.url, '_blank');
          setCheckoutMode('stripe');
        } else {
          alert('Failed to initialize Stripe checkout.');
        }
      }
    );
  };

  if (walletBalance === null) {
    return (
      <div className="fixed inset-0 z-[99999] bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center font-sans">
        <div className="w-16 h-16 border-4 border-black border-t-[#00ff66] rounded-full animate-spin mb-4 shadow-[4px_4px_0_0_#000]"></div>
        <div className="text-black font-mono tracking-widest text-xs font-black uppercase bg-[#00ff66] px-2 py-1 border-2 border-black shadow-[2px_2px_0_0_#000]">
          Establishing Neural Link...
        </div>
      </div>
    );
  }

  if (walletBalance < 0) {
    return (
      <div className="fixed inset-0 z-[99999] bg-white/90 backdrop-blur-sm flex items-center justify-center font-sans p-4">
        <div className="nb-box p-8 max-w-md w-full text-center relative overflow-hidden animate-in zoom-in-95 duration-200">
          <div className="absolute top-0 left-0 w-full h-2 bg-[#ff3333] border-b-4 border-black" />
          
          {checkoutMode !== 'none' && (
            <button
              onClick={() => setCheckoutMode('none')}
              className="absolute top-4 left-4 text-black hover:bg-[#ffcc00] border-2 border-transparent hover:border-black transition-colors z-50 p-1"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}

          <button
            onClick={() => setUiState('MINIMIZED')}
            className="absolute top-4 right-4 text-black hover:bg-[#ff3333] border-2 border-transparent hover:border-black transition-colors z-50 p-1"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {checkoutMode === 'stripe' ? (
            <div className="p-6 border-4 border-black bg-[#ffcc00] text-center animate-pulse mb-6 mt-8 shadow-[4px_4px_0_0_#000]">
              <p className="text-black font-black uppercase tracking-widest mb-2">Awaiting Payment...</p>
              <p className="text-sm text-black/80 font-bold">Please complete the checkout in the new tab. This screen will unlock automatically.</p>
              <button onClick={() => setCheckoutMode('none')} className="mt-4 text-xs text-black font-bold underline">Cancel</button>
            </div>
          ) : checkoutMode === 'payment_options' ? (
            <div className="mt-6">
              <div className="w-full h-[400px] overflow-hidden border-4 border-black mb-4 bg-white relative shadow-[4px_4px_0_0_#000]">
                <iframe src={`http://localhost:3000/wallet/embed?userId=${userId}&amount=${Math.abs(walletBalance)}`} className="w-full h-full border-0" />
              </div>

              <div className="flex items-center gap-4 mb-4">
                <div className="h-1 bg-black flex-1"></div>
                <span className="text-[10px] text-black uppercase tracking-widest font-black">OR</span>
                <div className="h-1 bg-black flex-1"></div>
              </div>

              <button onClick={handleStripeCheckout} disabled={isStripeLoading} className="nb-btn w-full py-3 px-2 text-xs flex justify-center items-center gap-2 disabled:opacity-50">
                <span>{isStripeLoading ? 'Loading...' : 'Pay with Card (Global)'}</span>
              </button>
            </div>
          ) : (
            <div className="mt-4">
              <div className="py-8 px-2 text-center mb-4">
                <p className="text-black font-black uppercase text-3xl leading-snug tracking-tighter bg-[#ff3333] text-white p-2 border-4 border-black shadow-[4px_4px_0_0_#000]">
                  "{getDialogue(personaScore, 'loss')}"
                </p>
              </div>

              <div className="bg-white border-4 border-black p-4 mb-6 flex justify-between items-center text-sm shadow-[4px_4px_0_0_#000]">
                <span className="text-black uppercase tracking-widest text-xs font-black">Penalty Due</span>
                <span className="text-black font-mono font-black text-2xl">${(Math.abs(walletBalance) / 100).toFixed(2)}</span>
              </div>

              <button onClick={() => setCheckoutMode('payment_options')} className="nb-btn nb-btn-danger w-full py-4 px-4 mb-6 tracking-[0.2em] text-lg text-white">
                RESTORE HONOR
              </button>

              <button onClick={handlePermanentBan} className="text-black font-black uppercase tracking-[0.2em] text-[10px] hover:bg-black hover:text-white px-2 py-1 transition-colors border-2 border-transparent hover:border-black">
                i quit and will never come here again
              </button>
            </div>
          )}
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
          setActiveContracts(prev => [...prev, res.data.contract]);
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
    <div className="fixed inset-0 z-[99999] bg-white/90 backdrop-blur-sm flex items-center justify-center font-sans p-4">
      <div className="nb-box p-6 max-w-md w-full relative overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="absolute top-0 left-0 w-full h-2 bg-black" />
        <button
          onClick={() => setUiState('MINIMIZED')}
          className="absolute top-4 right-4 text-black hover:bg-[#ff3333] border-2 border-transparent hover:border-black transition-colors z-50 p-1"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {view !== 'main' && view !== 'active_sessions' && (
          <button
            onClick={() => setView('main')}
            className="absolute top-4 left-4 text-black hover:bg-[#ffcc00] border-2 border-transparent hover:border-black transition-colors z-50 p-1"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}

        {/* Top Tab Bar Navigation */}
        {(view === 'main' || view === 'active_sessions') && (
          <div className="flex border-4 border-black bg-white mb-6 p-1 shadow-[2px_2px_0_0_#000]">
            <button
              onClick={() => setView('main')}
              className={`flex-1 py-2 text-xs font-black uppercase tracking-widest border-2 border-transparent transition ${view === 'main' ? 'bg-[#00ff66] border-black shadow-[2px_2px_0_0_#000] text-black' : 'text-black hover:bg-black/5'}`}
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
              className={`flex-1 py-2 text-xs font-black uppercase tracking-widest border-2 border-transparent transition ${view === 'active_sessions' ? 'bg-[#ffcc00] border-black shadow-[2px_2px_0_0_#000] text-black' : 'text-black hover:bg-black/5'}`}
            >
              Active Pacts
            </button>
          </div>
        )}

        {view === 'active_sessions' && (
          <div>
            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
              {activeSessions.length === 0 ? (
                <div className="text-center p-6 border-4 border-black bg-white shadow-[4px_4px_0_0_#000]">
                  <p className="text-black font-bold uppercase tracking-wider">You have no active pacts.</p>
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
                      className="block p-4 border-4 border-black bg-[#fdfdfd] hover:-translate-y-1 hover:shadow-[4px_4px_0_0_#000] transition-all group"
                    >
                      <div className="flex justify-between items-start mb-2 border-b-2 border-black pb-2">
                        <h3 className="text-black font-black text-sm uppercase truncate pr-4">
                          {session.problems.title}
                        </h3>
                        <span className="text-xs font-mono bg-[#00ff66] px-1 border-2 border-black text-black font-black whitespace-nowrap">
                          ${(session.amount_cents / 100).toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-xs text-black uppercase font-bold mt-2">
                        <span className="bg-black text-white px-2 py-0.5">{session.problems.platform}</span>
                        <span className="bg-[#ffcc00] border-2 border-black px-2 py-0.5">{session.mode === 'one_shot' ? 'One Shot' : 'Time Crunch'}</span>
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
            <h2 className="text-3xl font-black text-black mb-6 tracking-tighter uppercase bg-[#00ff66] inline-block px-4 py-1 border-4 border-black shadow-[4px_4px_0_0_#000]">COMMAND DASHBOARD</h2>

            {activeContracts.length > 0 && (
              <div className="space-y-4 mb-6">
                {activeContracts.map(contract => (
                  <div key={contract.id} className={`p-4 border-4 border-black text-left shadow-[4px_4px_0_0_#000] ${contract.mode === 'blood_pact' ? 'bg-[#ff3333]' : 'bg-[#ffcc00]'}`}>
                    <div className="flex justify-between items-center mb-2 bg-white border-2 border-black px-2 py-1">
                      <h3 className="text-black font-black uppercase tracking-widest text-xs">Active {contract.mode === 'blood_pact' ? 'Blood Pact' : 'Gauntlet'}</h3>
                      <span className="text-black text-xs font-mono font-black">${(contract.penalty_cents / 100).toFixed(2)} PENALTY</span>
                    </div>
                    <div className="text-black font-bold text-sm mb-4 bg-white/90 p-2 border-2 border-black">
                      {contract.mode === 'blood_pact'
                        ? `Day ${contract.current_day} of ${contract.target_days}. Solved today: ${contract.problems_solved_today}/${contract.target_problems_per_day}`
                        : `Gauntlet: Solved ${contract.total_problems_solved}/${contract.target_problems_per_day}`
                      }
                    </div>
                    <button onClick={handleSolveForContract} className="w-full bg-black hover:bg-black/80 text-white border-4 border-transparent py-2 transition text-sm font-black tracking-wider uppercase">
                      SOLVE PROBLEM
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="grid grid-cols-1 gap-4">
              <button
                onClick={() => {
                  const isProblemPage = window.location.pathname.includes("/problems/") && window.location.pathname.split("/")[2];
                  if (isProblemPage) setView('quick_play');
                }}
                className={`p-4 transition text-left group border-4 border-black shadow-[4px_4px_0_0_#000] ${(window.location.pathname.includes("/problems/") && window.location.pathname.split("/")[2]) ? "bg-white hover:-translate-y-1 hover:shadow-[6px_6px_0_0_#000] cursor-pointer" : "bg-gray-200 text-gray-500 cursor-not-allowed"}`}
              >
                <div className={`font-black mb-1 uppercase text-lg ${(window.location.pathname.includes("/problems/") && window.location.pathname.split("/")[2]) ? "text-black group-hover:text-[#00ff66]" : "text-gray-500"}`}>
                  Quick Play {(window.location.pathname.includes("/problems/") && window.location.pathname.split("/")[2]) ? "" : "(Nav to problem first)"}
                </div>
                <div className="text-xs font-bold text-black/70">Micro-stake on a single problem. Fast and brutal.</div>
              </button>

              {!activeContracts.find(c => c.mode === 'blood_pact') && (
                <button onClick={() => setView('blood_pact')} className="bg-[#ff3333] border-4 border-black text-black p-4 transition text-left group hover:-translate-y-1 hover:shadow-[6px_6px_0_0_#000] shadow-[4px_4px_0_0_#000]">
                  <div className="font-black text-white text-xl uppercase mb-1 drop-shadow-[2px_2px_0_rgba(0,0,0,1)]">The Blood Pact</div>
                  <div className="text-xs font-bold bg-white px-2 py-1 border-2 border-black inline-block mt-1">Multi-day streak contract. Miss a day, owe a massive debt.</div>
                </button>
              )}
              {!activeContracts.find(c => c.mode === 'gauntlet') && (
                <button onClick={() => setView('gauntlet')} className="bg-[#ffcc00] border-4 border-black text-black p-4 transition text-left group hover:-translate-y-1 hover:shadow-[6px_6px_0_0_#000] shadow-[4px_4px_0_0_#000]">
                  <div className="font-black text-black text-xl uppercase mb-1">The Gauntlet</div>
                  <div className="text-xs font-bold bg-white px-2 py-1 border-2 border-black inline-block mt-1">Endurance mode. 5 problems back-to-back under a strict timer.</div>
                </button>
              )}
            </div>
          </div>
        )}

        {view === 'quick_play' && (
          <div className="text-center">
            <h2 className="text-3xl font-black text-black mb-4 uppercase tracking-tighter inline-block bg-[#00ff66] px-4 py-1 border-4 border-black shadow-[4px_4px_0_0_#000]">Quick Play</h2>
            <div className="bg-white border-4 border-black shadow-[4px_4px_0_0_#000] p-4 mb-6 text-left space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-black font-black uppercase tracking-widest">Your Stake:</span>
                <div className="flex gap-4 items-center w-2/3">
                  <input type="range" min="100" max="10000" step="100" value={stakeAmount} onChange={(e) => setStakeAmount(Number(e.target.value))} className="w-full accent-[#00ff66] bg-gray-200 rounded-none appearance-none cursor-pointer h-2 border-y-2 border-black" />
                  <div className="relative flex items-center justify-end w-24">
                    <span className="absolute left-2 text-black font-black text-xs">$</span>
                    <input type="number" min="1" value={stakeAmount / 100} onChange={(e) => setStakeAmount(Math.max(1, Number(e.target.value)) * 100)} className="bg-[#00ff66] border-2 border-black px-2 py-1 text-black font-mono font-black outline-none w-full text-right" />
                  </div>
                </div>
              </div>
              <div className="flex justify-between items-center text-sm pt-2 border-t-2 border-black">
                <span className="text-black font-black uppercase tracking-widest">Mode:</span>
                <div className="flex gap-2 items-center">
                  <button onClick={() => setStakeMode("time_crunch")} className={`px-2 py-1 font-bold text-xs uppercase border-2 transition ${stakeMode === "time_crunch" ? 'bg-black text-white border-black' : 'bg-white text-black border-black hover:bg-gray-100'}`}>⏱️ Time Crunch</button>
                  <button onClick={() => setStakeMode("one_shot")} className={`px-2 py-1 font-bold text-xs uppercase border-2 transition ${stakeMode === "one_shot" ? 'bg-black text-white border-black' : 'bg-white text-black border-black hover:bg-gray-100'}`}>🎯 One Shot</button>
                </div>
              </div>
              {stakeMode === "time_crunch" && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-black font-black uppercase tracking-widest">Timer:</span>
                  <div className="flex gap-4 items-center w-2/3">
                    <input type="range" min="5" max="180" step="5" value={timerDuration} onChange={(e) => setTimerDuration(Number(e.target.value))} className="w-full accent-black bg-gray-200 rounded-none appearance-none cursor-pointer h-2 border-y-2 border-black" />
                    <div className="flex flex-col items-end w-24">
                      <div className="relative w-full">
                        <input type="number" min="5" step="5" value={timerDuration} onChange={(e) => setTimerDuration(Math.max(1, Number(e.target.value)))} className="bg-white border-2 border-black px-2 py-1 text-black font-mono font-black outline-none w-full text-right" />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-black text-xs font-bold">m</span>
                      </div>
                      {timerDuration >= 60 && <span className="text-[10px] text-black font-bold mt-1">({Math.floor(timerDuration / 60)}h {timerDuration % 60 > 0 ? `${timerDuration % 60}m` : ''})</span>}
                    </div>
                  </div>
                </div>
              )}
            </div>
            <button onClick={handleQuickPlay} disabled={isCommitting} className="nb-btn nb-btn-primary w-full py-4 mt-4 text-xl">{isCommitting ? "..." : "START STAKE"}</button>
          </div>
        )}

        {view === 'blood_pact' && (
          <div className="text-center">
            <h2 className="text-3xl font-black text-white mb-2 uppercase tracking-tighter inline-block bg-[#ff3333] px-4 py-1 border-4 border-black shadow-[4px_4px_0_0_#000]">The Blood Pact</h2>
            <p className="text-xs font-bold text-black mb-6 bg-[#ffcc00] px-2 py-1 inline-block border-2 border-black">If you miss your quota before midnight, you incur a massive debt.</p>
            <div className="bg-white border-4 border-black shadow-[4px_4px_0_0_#000] p-4 mb-6 text-left space-y-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-black font-black uppercase tracking-widest">Length:</span>
                <div className="flex gap-4 items-center w-2/3">
                  <input type="range" min="1" max="100" step="1" value={pactDays} onChange={(e) => setPactDays(Number(e.target.value))} className="w-full accent-[#ff3333] bg-gray-200 rounded-none appearance-none cursor-pointer h-2 border-y-2 border-black" />
                  <div className="flex flex-col items-end w-24">
                    <div className="relative w-full">
                      <input type="number" min="1" value={pactDays} onChange={(e) => setPactDays(Math.max(1, Number(e.target.value)))} className="bg-white border-2 border-black px-2 py-1 text-black font-mono font-black outline-none w-full text-right" />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-black text-xs font-bold">d</span>
                    </div>
                    {pactDays >= 30 && <span className="text-[10px] text-black font-bold mt-1">(~{(pactDays / 30).toFixed(1)}m)</span>}
                  </div>
                </div>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-black font-black uppercase tracking-widest">Daily Quota:</span>
                <div className="flex items-center gap-3 bg-white border-2 border-black p-1">
                  <button onClick={() => setPactProblems(Math.max(1, pactProblems - 1))} className="w-6 h-6 bg-black hover:bg-gray-800 text-white font-bold flex items-center justify-center">-</button>
                  <span className="text-black font-mono font-black w-4 text-center">{pactProblems}</span>
                  <button onClick={() => setPactProblems(Math.min(10, pactProblems + 1))} className="w-6 h-6 bg-black hover:bg-gray-800 text-white font-bold flex items-center justify-center">+</button>
                </div>
              </div>
              <div className="flex justify-between items-center text-sm pt-2 border-t-2 border-black">
                <span className="text-[#ff3333] font-black uppercase tracking-widest">Failure Penalty:</span>
                <div className="flex gap-4 items-center w-2/3">
                  <input type="range" min="500" max="50000" step="500" value={pactPenalty} onChange={(e) => setPactPenalty(Number(e.target.value))} className="w-full accent-[#ff3333] bg-gray-200 rounded-none appearance-none cursor-pointer h-2 border-y-2 border-black" />
                  <div className="relative flex items-center justify-end w-24">
                    <span className="absolute left-2 text-white font-black text-xs">$</span>
                    <input type="number" min="5" value={pactPenalty / 100} onChange={(e) => setPactPenalty(Math.max(1, Number(e.target.value)) * 100)} className="bg-[#ff3333] text-white border-2 border-black px-2 py-1 font-mono font-black outline-none w-full text-right" />
                  </div>
                </div>
              </div>
            </div>
            <button onClick={() => handleStartContract('blood_pact')} disabled={isCommitting} className="nb-btn nb-btn-danger w-full text-white py-4 mt-4 text-xl">SEAL THE PACT</button>
          </div>
        )}

        {view === 'gauntlet' && (
          <div className="text-center">
            <h2 className="text-3xl font-black text-black mb-2 uppercase tracking-tighter inline-block bg-[#ffcc00] px-4 py-1 border-4 border-black shadow-[4px_4px_0_0_#000]">The Gauntlet</h2>
            <p className="text-xs font-bold text-black mb-6 bg-white px-2 py-1 inline-block border-2 border-black">Complete 5 problems back-to-back in under 3 hours. No pauses.</p>
            <div className="bg-white border-4 border-black shadow-[4px_4px_0_0_#000] p-4 mb-6 text-left space-y-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-black font-black uppercase tracking-widest">Target Problems:</span>
                <div className="flex items-center gap-3 bg-white border-2 border-black p-1">
                  <button onClick={() => setGauntletProblems(Math.max(1, gauntletProblems - 1))} className="w-6 h-6 bg-black hover:bg-gray-800 text-white font-bold flex items-center justify-center">-</button>
                  <span className="text-black font-mono font-black w-4 text-center">{gauntletProblems}</span>
                  <button onClick={() => setGauntletProblems(Math.min(20, gauntletProblems + 1))} className="w-6 h-6 bg-black hover:bg-gray-800 text-white font-bold flex items-center justify-center">+</button>
                </div>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-black font-black uppercase tracking-widest">Time Limit:</span>
                <div className="flex gap-4 items-center w-2/3">
                  <input type="range" min="30" max="300" step="30" value={gauntletMinutes} onChange={(e) => setGauntletMinutes(Number(e.target.value))} className="w-full accent-[#ffcc00] bg-gray-200 rounded-none appearance-none cursor-pointer h-2 border-y-2 border-black" />
                  <div className="flex flex-col items-end w-24">
                    <div className="relative w-full">
                      <input type="number" min="30" step="30" value={gauntletMinutes} onChange={(e) => setGauntletMinutes(Math.max(1, Number(e.target.value)))} className="bg-white border-2 border-black px-2 py-1 text-black font-mono font-black outline-none w-full text-right" />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-black text-xs font-bold">m</span>
                    </div>
                    {gauntletMinutes >= 60 && <span className="text-[10px] text-black font-bold mt-1">({Math.floor(gauntletMinutes / 60)}h {gauntletMinutes % 60 > 0 ? `${gauntletMinutes % 60}m` : ''})</span>}
                  </div>
                </div>
              </div>
              <div className="flex justify-between items-center text-sm pt-2 border-t-2 border-black">
                <span className="text-[#ff3333] font-black uppercase tracking-widest">Failure Penalty:</span>
                <div className="flex gap-4 items-center w-2/3">
                  <input type="range" min="500" max="50000" step="500" value={pactPenalty} onChange={(e) => setPactPenalty(Number(e.target.value))} className="w-full accent-[#ff3333] bg-gray-200 rounded-none appearance-none cursor-pointer h-2 border-y-2 border-black" />
                  <div className="relative flex items-center justify-end w-24">
                    <span className="absolute left-2 text-white font-black text-xs">$</span>
                    <input type="number" min="5" value={pactPenalty / 100} onChange={(e) => setPactPenalty(Math.max(1, Number(e.target.value)) * 100)} className="bg-[#ff3333] text-white border-2 border-black px-2 py-1 font-mono font-black outline-none w-full text-right" />
                  </div>
                </div>
              </div>
            </div>
            <button onClick={() => handleStartContract('gauntlet')} disabled={isCommitting} className="nb-btn nb-btn-warning w-full py-4 mt-4 text-xl">ENTER THE GAUNTLET</button>
          </div>
        )}

      </div>
    </div>
  );
}
