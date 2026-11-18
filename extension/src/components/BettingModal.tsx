import { useState, useEffect } from 'react';
import type { UIState, ChallengeContract } from '../types';
import { getDebtRoast } from '../lib/PersonalityDialogues';
import { LiveCountdownBadge } from './LiveCountdownBadge';
import { API_BASE_URL } from '../config';

interface Props {
  userId: string;
  uiState: UIState;
  setUiState: (state: UIState) => void;
  activeSessionId?: string | null;
  setActiveSessionId: (id: string | null) => void;
  setActiveSessionMode: (mode: string) => void;
  setTimerEndMs: (ms: number | null) => void;
  setHasActiveContract: (has: boolean) => void;
  strictMode: boolean;
  setStrictMode: (val: boolean) => void;
  hasActiveMoneyStake: boolean;
  isAntiCheatActive: boolean;
  onSyncState?: () => void;
}

type DashboardView = 'active_sessions' | 'main' | 'quick_play' | 'blood_pact' | 'gauntlet' | 'debt';

export function BettingModal({
  userId,
  uiState,
  setUiState,
  activeSessionId,
  setActiveSessionId,
  setActiveSessionMode,
  setTimerEndMs,
  setHasActiveContract,
  strictMode,
  setStrictMode,
  hasActiveMoneyStake,
  isAntiCheatActive,
  onSyncState,
}: Props) {
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
  const [debtRoast, setDebtRoast] = useState<string>(() => getDebtRoast());
  const [isBanned, setIsBanned] = useState<boolean>(false);
  const [activeContracts, setActiveContracts] = useState<ChallengeContract[]>([]);
  const [isCommitting, setIsCommitting] = useState(false);

  // Checkout State
  const [checkoutMode, setCheckoutMode] = useState<'none' | 'awaiting_payment'>('none');
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);
  const [isHonorRestoredFlash, setIsHonorRestoredFlash] = useState(false);

  // Keep view in sync when entering or clearing debt
  useEffect(() => {
    if (walletBalance !== null && walletBalance < 0) {
      if (view !== 'active_sessions' && view !== 'debt') {
        setView('debt');
      }
    } else if (walletBalance !== null && walletBalance >= 0) {
      if (view === 'debt') {
        setIsHonorRestoredFlash(true);
        const timer = setTimeout(() => {
          setIsHonorRestoredFlash(false);
          setView('main');
          setCheckoutMode('none');
        }, 1800);
        return () => clearTimeout(timer);
      }
    }
  }, [walletBalance]);

  // Unified Fetch: Contracts, Wallet, and Active Sessions
  const fetchActiveData = () => {
    if (!userId) return;

    // Fetch Active Contracts (which triggers Lazy Evaluation sweep in backend)
    chrome.runtime.sendMessage(
      { action: 'fetch_api', url: `${API_BASE_URL}/api/extension/contracts?userId=${userId}&t=${Date.now()}` },
      (contractRes) => {
        const contracts = contractRes?.data?.contracts || [];
        setActiveContracts(contracts);
        setHasActiveContract(contracts.length > 0);

        // Fetch Wallet (guarantees sweep debt is reflected)
        chrome.runtime.sendMessage(
          { action: 'fetch_api', url: `${API_BASE_URL}/api/extension/wallet?userId=${userId}&t=${Date.now()}` },
          (walletRes) => {
            if (walletRes?.data?.balanceCents !== undefined) {
              setWalletBalance(walletRes.data.balanceCents);
              if (walletRes.data.isBanned) {
                setIsBanned(true);
              }
            }
          }
        );

        // Fetch Active Sessions
        chrome.runtime.sendMessage(
          { action: 'fetch_api', url: `${API_BASE_URL}/api/extension/sessions?userId=${userId}&t=${Date.now()}` },
          (sessionsRes) => {
            if (sessionsRes?.data?.sessions) {
              setActiveSessions(sessionsRes.data.sessions);
            }
          }
        );
      }
    );
  };

  useEffect(() => {
    if (uiState === 'MODAL' && userId) {
      fetchActiveData();
    }
  }, [uiState, userId]);

  // Window Focus listener: keep active contracts & wallet fresh if user switched tabs
  useEffect(() => {
    const onFocus = () => {
      if (uiState === 'MODAL' && userId) {
        fetchActiveData();
      }
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [uiState, userId]);

  // Payment Polling: while debt is unpaid, refresh data every 2.5s
  useEffect(() => {
    let interval: any;
    if (walletBalance !== null && walletBalance < 0) {
      interval = setInterval(() => {
        fetchActiveData();
      }, 2500);
    }
    return () => clearInterval(interval);
  }, [walletBalance, checkoutMode, userId]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'CODESTAKE_PAYMENT_SUCCESS') {
        fetchActiveData();
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [userId]);

  if (uiState !== 'MODAL') return null;

  if (isBanned) {
    return (
      <div className="fixed inset-0 z-[99999] bg-white/90 backdrop-blur-sm flex items-center justify-center font-sans p-4">
        <div className="nb-box p-8 max-w-md w-full text-center relative overflow-hidden animate-in zoom-in-95 duration-200">
          <div className="absolute top-0 left-0 w-full h-2 bg-[#ff3333] border-b-4 border-black" />

          <button
            onClick={() => setUiState('MINIMIZED')}
            className="absolute top-4 right-4 text-black hover:bg-[#ff3333] border-2 border-transparent hover:border-black transition-colors z-50 p-1"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="py-6 px-2 text-center mb-4 mt-2">
            <h2 className="text-white font-black uppercase text-3xl leading-snug tracking-tighter bg-[#ff3333] p-2 border-4 border-black shadow-[4px_4px_0_0_#000]">
              EXILED
            </h2>
          </div>

          <p className="text-black font-bold text-sm mb-6 bg-white border-2 border-black p-4 shadow-[2px_2px_0_0_#000] italic">
            "You chose the coward's way out.<br />
            Your pact is broken.<br />
            You are permanently banished."
          </p>
          <div className="text-xs font-black text-black bg-[#ffcc00] border-2 border-black py-2 tracking-widest uppercase shadow-[2px_2px_0_0_#000]">
            NO RETURN.
          </div>
        </div>
      </div>
    );
  }

  const handleStripeCheckout = () => {
    setIsCheckoutLoading(true);
    chrome.runtime.sendMessage(
      {
        action: 'fetch_api',
        url: `${API_BASE_URL}/api/extension/checkout/stripe`,
        options: {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, amountCents: Math.abs(walletBalance!) })
        }
      },
      (res) => {
        setIsCheckoutLoading(false);
        if (res?.data?.url) {
          window.open(res.data.url, '_blank');
          setCheckoutMode('awaiting_payment');
        } else {
          const detail = res?.data?.error || res?.error || `Make sure the server is accessible at ${API_BASE_URL}.`;
          alert('Failed to initialize Stripe checkout: ' + detail);
        }
      }
    );
  };

  if (walletBalance === null) {
    return (
      <div className="fixed inset-0 z-[99999] bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center font-sans">
        <div className="w-16 h-16 border-4 border-black border-t-[#00ff66] rounded-full animate-spin mb-4 shadow-[4px_4px_0_0_#000]"></div>
        <div className="text-black font-mono tracking-widest text-xs font-black uppercase bg-[#00ff66] px-2 py-1 border-2 border-black shadow-[2px_2px_0_0_#000]">
          Loading CodeStake...
        </div>
      </div>
    );
  }

  const handleStartContract = async (mode: 'blood_pact' | 'gauntlet') => {
    setIsCommitting(true);
    chrome.runtime.sendMessage(
      {
        action: 'fetch_api',
        url: `${API_BASE_URL}/api/extension/contracts`,
        options: {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId,
            mode,
            targetDays: mode === 'blood_pact' ? pactDays : 1,
            targetProblemsPerDay: mode === 'blood_pact' ? pactProblems : gauntletProblems,
            durationMinutes: mode === 'gauntlet' ? gauntletMinutes : undefined,
            penaltyCents: pactPenalty,
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
          })
        }
      },
      (res) => {
        setIsCommitting(false);
        if (res?.data?.contract) {
          const newContract = res.data.contract;
          setActiveContracts(prev => [...prev, newContract]);
          setHasActiveContract(true);
          setView('active_sessions');
          if (onSyncState) onSyncState();
        } else {
          const errMsg = res?.data?.error || res?.error || "Error creating contract.";
          alert(errMsg);
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
        url: `${API_BASE_URL}/api/extension/commit`,
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
          if (onSyncState) onSyncState();
        } else {
          const errMsg = res?.data?.error || res?.error || "Error starting Quick Play.";
          alert(errMsg);
        }
      }
    );
  };

  // Wipes editor for active contracts without starting a Quick Play session
  const handleSolveForContract = () => {
    window.postMessage({ type: 'CODESTAKE_CLEAR_EDITOR' }, '*');
    setUiState('TRACKING');
    if (onSyncState) onSyncState();
    // Note: Interceptor handles the 'Accepted' verdict and sends to resolve API which increments contract progress.
  };

  const isDebtStrictLocked = Boolean(hasActiveMoneyStake);

  return (
    <div className="fixed inset-0 z-[99999] bg-white/90 backdrop-blur-sm flex items-center justify-center font-sans p-4">
      <div className="nb-box p-6 max-w-md w-full relative overflow-hidden animate-in zoom-in-95 duration-200">
        <div className={`absolute top-0 left-0 w-full h-2 ${walletBalance !== null && walletBalance < 0 && view === 'debt' ? 'bg-[#ff3333]' : 'bg-black'} border-b-4 border-black`} />
        
        {/* Close Modal Button */}
        <button
          onClick={() => setUiState(activeSessionId ? 'TRACKING' : 'MINIMIZED')}
          className="absolute top-4 right-4 text-black hover:bg-[#ff3333] border-2 border-transparent hover:border-black transition-colors z-50 p-1"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Back Button for Sub-views or Debt Checkout */}
        {view === 'debt' && checkoutMode !== 'none' && (
          <button
            onClick={() => {
              setCheckoutMode('none');
            }}
            className="absolute top-4 left-4 text-black hover:bg-[#ffcc00] border-2 border-transparent hover:border-black transition-colors z-50 p-1"
            title="Go back"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}

        {view !== 'main' && view !== 'active_sessions' && view !== 'debt' && (
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
        {(view === 'main' || view === 'active_sessions' || (view === 'debt' && checkoutMode === 'none')) && (
          <div className="flex border-4 border-black bg-white mt-6 mb-6 p-1 shadow-[2px_2px_0_0_#000]">
            {walletBalance !== null && walletBalance < 0 ? (
              <button
                onClick={() => setView('debt')}
                className={`flex-1 py-2 text-xs font-black uppercase tracking-widest border-2 border-transparent transition ${
                  view === 'debt'
                    ? 'bg-[#ff3333] border-black shadow-[2px_2px_0_0_#000] text-white'
                    : 'text-black hover:bg-black/5'
                }`}
              >
                💀 Restore Honor
              </button>
            ) : (
              <button
                onClick={() => setView('main')}
                className={`flex-1 py-2 text-xs font-black uppercase tracking-widest border-2 border-transparent transition ${
                  view === 'main'
                    ? 'bg-[#00ff66] border-black shadow-[2px_2px_0_0_#000] text-black'
                    : 'text-black hover:bg-black/5'
                }`}
              >
                Forge Pact
              </button>
            )}

            <button
              onClick={() => {
                setView('active_sessions');
                fetchActiveData();
              }}
              className={`flex-1 py-2 text-xs font-black uppercase tracking-widest border-2 border-transparent transition ${
                view === 'active_sessions'
                  ? 'bg-[#ffcc00] border-black shadow-[2px_2px_0_0_#000] text-black'
                  : 'text-black hover:bg-black/5'
              }`}
            >
              {`Active Pacts ${activeContracts.length + activeSessions.length > 0 ? `(${activeContracts.length + activeSessions.length})` : ''}`}
            </button>
          </div>
        )}

        {/* ── VIEW: DEBT / RESTORE HONOR ── */}
        {view === 'debt' && (
          <div>
            {isHonorRestoredFlash ? (
              <div className="p-8 border-4 border-black bg-[#00ff66] text-center mb-6 mt-4 shadow-[6px_6px_0_0_#000] animate-in zoom-in-95 duration-200">
                <div className="w-16 h-16 bg-white border-4 border-black flex items-center justify-center mx-auto mb-4 shadow-[3px_3px_0_0_#000]">
                  <svg className="w-10 h-10 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-2xl font-black uppercase tracking-tight text-black mb-1">
                  HONOR RESTORED!
                </h2>
                <p className="text-xs font-bold uppercase tracking-widest text-black">
                  Debt cleared. Arena unlocked.
                </p>
              </div>
            ) : checkoutMode === 'awaiting_payment' ? (
              <div className="p-6 border-4 border-black bg-[#ffcc00] text-center mb-6 mt-4 shadow-[6px_6px_0_0_#000] animate-in zoom-in-95 duration-200">
                <div className="w-12 h-12 border-4 border-black border-t-white animate-spin mx-auto mb-3 shadow-[2px_2px_0_0_#000]" />
                <p className="text-black font-black uppercase tracking-widest text-sm mb-1">
                  Awaiting Payment...
                </p>
                <p className="text-xs text-black/80 font-bold mb-4">
                  Complete card payment in the open Stripe tab. CodeStake will unlock automatically.
                </p>

                <div className="space-y-2">
                  <button
                    onClick={() => fetchActiveData()}
                    className="nb-btn nb-btn-primary w-full py-2.5 text-xs uppercase tracking-wider flex items-center justify-center gap-1.5"
                  >
                    <span>Check Status Now ⚡</span>
                  </button>
                  <button
                    onClick={() => setCheckoutMode('none')}
                    className="nb-btn w-full py-2 text-xs uppercase tracking-wider bg-white"
                  >
                    Cancel / Back
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-2 text-center">
                <div className="py-4 px-2 text-center mb-4">
                  <p className="text-black font-black uppercase text-2xl leading-snug tracking-tighter bg-[#ff3333] text-white p-3 border-4 border-black shadow-[4px_4px_0_0_#000]">
                    "{debtRoast}"
                  </p>
                  <button
                    onClick={() => setDebtRoast(getDebtRoast())}
                    type="button"
                    className="mt-2 text-[10px] font-black uppercase tracking-widest text-black/60 hover:text-black underline cursor-pointer"
                  >
                    ↻ Another Reality Check
                  </button>
                </div>

                <div className="bg-white border-4 border-black p-4 mb-5 flex justify-between items-center text-sm shadow-[4px_4px_0_0_#000]">
                  <span className="text-black uppercase tracking-widest text-xs font-black">Penalty Due</span>
                  <span className="text-black font-mono font-black text-2xl">${(Math.abs(walletBalance || 0) / 100).toFixed(2)}</span>
                </div>

                <button
                  onClick={handleStripeCheckout}
                  disabled={isCheckoutLoading}
                  className="nb-btn nb-btn-danger w-full py-3.5 px-4 mb-3 tracking-[0.2em] text-base text-white disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isCheckoutLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent animate-spin rounded-full" />
                      <span>OPENING STRIPE...</span>
                    </>
                  ) : (
                    <span>RESTORE HONOR (STRIPE)</span>
                  )}
                </button>

                <div className="text-center mb-4">
                  <a
                    href={`${API_BASE_URL}/wallet`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-black font-black uppercase tracking-wider hover:underline"
                  >
                    Open Web Ledger ↗
                  </a>
                </div>

                {/* Interview Strict Mode Toggle while in Debt */}
                <div className="bg-gray-50 border-2 border-black p-3 mb-5 text-left shadow-[2px_2px_0_0_#000]">
                  <div className="flex justify-between items-center gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="font-black text-xs uppercase tracking-wider text-black">
                          ⚡ Strict Mode
                        </span>
                        {isDebtStrictLocked ? (
                          <span className="text-[9px] font-black uppercase bg-[#ff3333] text-white px-1.5 py-0.5 border-2 border-black shadow-[1px_1px_0_0_#000]">
                            LOCKED ON 🔒
                          </span>
                        ) : (
                          <span className={`text-[8px] font-black uppercase px-1 py-0.2 border border-black ${strictMode ? 'bg-[#00ff66] text-black' : 'bg-gray-200 text-black/60'}`}>
                            {strictMode ? 'ACTIVE' : 'OFF'}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] font-bold text-black/70 leading-tight">
                        {isDebtStrictLocked
                          ? "Enforced across all problems because another challenge is still active."
                          : "Free interview practice (no paste, clean boilerplate) allowed while debt is active."}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        if (isDebtStrictLocked) return;
                        const nextVal = !strictMode;
                        setStrictMode(nextVal);
                        if (typeof chrome !== 'undefined' && chrome.storage?.local) {
                          chrome.storage.local.set({ strictMode: nextVal });
                        }
                      }}
                      disabled={isDebtStrictLocked}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer border-2 border-black transition-colors duration-200 ease-in-out shadow-[1px_1px_0_0_#000] ${
                        isDebtStrictLocked || strictMode ? 'bg-[#00ff66]' : 'bg-gray-200'
                      } ${isDebtStrictLocked ? 'cursor-not-allowed opacity-90' : 'hover:-translate-y-0.5'}`}
                      title={isDebtStrictLocked ? "Strict Mode is locked ON while another challenge is active" : "Toggle Interview Strict Mode"}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform border border-black bg-white shadow-[1px_1px_0_0_#000] transition duration-200 ease-in-out mt-0.5 ${
                          isDebtStrictLocked || strictMode ? 'translate-x-5' : 'translate-x-0.5'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── VIEW: ACTIVE PACTS (UNIFIED CONTRACTS & SESSIONS) ── */}
        {view === 'active_sessions' && (
          <div>
            <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1 custom-scrollbar">
              {/* Active Contracts (Blood Pact & Gauntlet) */}
              {activeContracts.length > 0 && (
                <div className="space-y-3 mb-3">
                  {activeContracts.map(contract => (
                    <div key={contract.id} className={`p-3.5 border-4 border-black text-left shadow-[4px_4px_0_0_#000] ${contract.mode === 'blood_pact' ? 'bg-[#ff3333]' : 'bg-[#ffcc00]'}`}>
                      <div className="flex justify-between items-center mb-1.5 bg-white border-2 border-black px-2 py-0.5">
                        <h3 className="text-black font-black uppercase tracking-widest text-[11px]">
                          {contract.mode === 'blood_pact' ? '🩸 Active Blood Pact' : '🔥 Active Gauntlet'}
                        </h3>
                        <span className="text-black text-[11px] font-mono font-black">
                          ${(contract.penalty_cents / 100).toFixed(2)} PENALTY
                        </span>
                      </div>
                      <div className="text-black font-bold text-xs mb-2.5 bg-white/90 p-2 border-2 border-black space-y-1.5">
                        {contract.mode === 'blood_pact' ? (
                          <>
                            <div className="flex justify-between items-center text-[11px]">
                              <span>Day {contract.current_day} of {contract.target_days}</span>
                              <span className="font-mono bg-black text-white px-1.5 py-0.2 text-[10px]">
                                {contract.problems_solved_today}/{contract.target_problems_per_day} SOLVED
                              </span>
                            </div>
                            <div className="flex justify-between items-center pt-1 border-t border-black/15 text-[10px]">
                              {contract.problems_solved_today >= contract.target_problems_per_day ? (
                                <>
                                  <span className="text-[#00aa33] font-black">✅ Safe Today! Next day in:</span>
                                  <LiveCountdownBadge expiresAt={contract.expires_at} style="digital" prefix="⏰ " className="text-[#00aa33] text-xs" />
                                </>
                              ) : (
                                <>
                                  <span className="text-[#ff3333] font-black">⏰ Reset at Midnight:</span>
                                  <LiveCountdownBadge expiresAt={contract.expires_at} style="digital" prefix="⏰ " className="text-[#ff3333] text-xs font-black" />
                                </>
                              )}
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="flex justify-between items-center text-[11px]">
                              <span>Solved: {contract.total_problems_solved}/{contract.target_problems_per_day} problems</span>
                              <span className="font-mono bg-black text-white px-1.5 py-0.2 text-[10px]">
                                {Math.round(((contract.total_problems_solved || 0) / (contract.target_problems_per_day || 1)) * 100)}%
                              </span>
                            </div>
                            <div className="flex justify-between items-center pt-1 border-t border-black/15 text-[10px]">
                              <span className="font-black text-black uppercase">Time Remaining:</span>
                              <LiveCountdownBadge expiresAt={contract.expires_at} style="digital" prefix="⏱️ " className="text-xs text-[#ff3333] font-black" />
                            </div>
                          </>
                        )}
                      </div>
                      <button onClick={handleSolveForContract} className="w-full bg-black hover:bg-black/80 text-white border-2 border-black py-1.5 transition text-xs font-black tracking-wider uppercase shadow-[2px_2px_0_0_#000]">
                        SOLVE PROBLEM ↗
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Active Quick Play Sessions */}
              {activeSessions.length > 0 && (
                <div className="space-y-3">
                  {activeSessions.filter(s => s.problems !== null).map(session => {
                    const url = session.problems.platform === "leetcode"
                      ? `https://leetcode.com/problems/${session.problems.slug}`
                      : "#";

                    return (
                      <a
                        key={session.id}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block p-3.5 border-4 border-black bg-white hover:-translate-y-0.5 hover:shadow-[4px_4px_0_0_#000] transition-all group"
                      >
                        <div className="flex justify-between items-start mb-1.5 border-b-2 border-black pb-1">
                          <h3 className="text-black font-black text-xs uppercase truncate pr-3 group-hover:text-[#00ff66]">
                            {session.problems.title}
                          </h3>
                          <span className="text-xs font-mono bg-[#00ff66] px-1.5 py-0.5 border-2 border-black text-black font-black whitespace-nowrap">
                            ${(session.amount_cents / 100).toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-[10px] text-black uppercase font-bold mt-1">
                          <div className="flex items-center gap-1.5">
                            <span className="bg-black text-white px-1.5 py-0.5">{session.problems.platform}</span>
                            <span className="bg-[#ffcc00] border border-black px-1.5 py-0.5">
                              {session.mode === 'one_shot' ? 'One Shot' : 'Time Crunch'}
                            </span>
                          </div>
                          {session.mode === 'time_crunch' && session.expires_at ? (
                            <div className="flex items-center gap-1 bg-red-50 border border-black px-1.5 py-0.5 shadow-[1px_1px_0_0_#000]">
                              <LiveCountdownBadge expiresAt={session.expires_at} style="digital" prefix="⏱️ " className="text-[11px]" />
                            </div>
                          ) : (
                            <span className="text-black/50 font-mono text-[9px]">NO TIMER</span>
                          )}
                        </div>
                      </a>
                    );
                  })}
                </div>
              )}

              {/* Empty State */}
              {activeContracts.length === 0 && activeSessions.length === 0 && (
                <div className="text-center p-6 border-4 border-black bg-white shadow-[4px_4px_0_0_#000]">
                  <p className="text-black font-bold uppercase tracking-wider text-xs">You have no active pacts or challenges.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {view === 'main' && (
          <div className="text-center">
            <h2 className="text-3xl font-black text-black mb-4 tracking-tighter uppercase bg-[#00ff66] inline-block px-4 py-1 border-4 border-black shadow-[4px_4px_0_0_#000]">COMMAND DASHBOARD</h2>

            {/* Global Interview Strict Mode Card */}
            <div className="p-3 border-4 border-black bg-white shadow-[4px_4px_0_0_#000] text-left mb-6">
              <div className="flex justify-between items-center gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-black text-xs uppercase tracking-wider text-black">
                      ⚡ Interview Strict Mode
                    </span>
                    {hasActiveMoneyStake ? (
                      <span className="text-[9px] font-black uppercase bg-[#ff3333] text-white px-1.5 py-0.5 border-2 border-black shadow-[1px_1px_0_0_#000]">
                        LOCKED ON 🔒
                      </span>
                    ) : (
                      <span className="text-[9px] font-black uppercase bg-[#00ff66] text-black px-1.5 py-0.5 border-2 border-black shadow-[1px_1px_0_0_#000]">
                        FREE
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] font-bold text-black/70 leading-snug">
                    {hasActiveMoneyStake
                      ? "Enforced across all problems during your active challenge."
                      : "Zero stakes. Blocks paste & resets boilerplate across all problems."}
                  </p>
                </div>

                {/* Neo-brutalism Toggle Switch */}
                <button
                  type="button"
                  onClick={() => {
                    if (hasActiveMoneyStake) return;
                    const nextVal = !strictMode;
                    setStrictMode(nextVal);
                    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
                      chrome.storage.local.set({ strictMode: nextVal });
                    }
                  }}
                  disabled={hasActiveMoneyStake}
                  className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer border-2 border-black transition-colors duration-200 ease-in-out shadow-[2px_2px_0_0_#000] ${
                    isAntiCheatActive ? 'bg-[#00ff66]' : 'bg-gray-200'
                  } ${hasActiveMoneyStake ? 'cursor-not-allowed opacity-90' : 'hover:-translate-y-0.5 active:translate-y-0'}`}
                  title={hasActiveMoneyStake ? "Anti-Cheat is locked ON while stakes are active" : "Toggle Interview Strict Mode"}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform border-2 border-black bg-white shadow-[1px_1px_0_0_#000] transition duration-200 ease-in-out mt-0.5 ${
                      isAntiCheatActive ? 'translate-x-5' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>
            </div>

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
            <h2 className="text-3xl font-black text-black mt-6 mb-4 uppercase tracking-tighter inline-block bg-[#00ff66] px-4 py-1 border-4 border-black shadow-[4px_4px_0_0_#000]">Quick Play</h2>
            <div className="bg-white border-4 border-black shadow-[4px_4px_0_0_#000] p-4 mb-6 text-left space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-black font-black uppercase tracking-widest text-xs">Your Stake:</span>
                <div className="flex gap-3 items-center w-2/3">
                  <input
                    type="range"
                    min="0"
                    max="50000"
                    step="100"
                    value={stakeAmount}
                    onChange={(e) => setStakeAmount(Number(e.target.value))}
                    className="w-full accent-[#00ff66] bg-gray-200 rounded-none appearance-none cursor-pointer h-2 border-y-2 border-black"
                  />
                  <div className="flex items-center border-2 border-black bg-[#00ff66] px-2 py-1 shadow-[2px_2px_0_0_#000] shrink-0">
                    <span className="text-black font-black text-xs select-none mr-1">$</span>
                    <input
                      type="number"
                      min="0"
                      value={stakeAmount / 100}
                      onChange={(e) => setStakeAmount(Math.max(0, Math.floor(Number(e.target.value) * 100)))}
                      className="bg-transparent text-black font-mono font-black outline-none w-14 text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>
                </div>
              </div>
              <div className="flex justify-between items-center text-sm pt-2 border-t-2 border-black">
                <span className="text-black font-black uppercase tracking-widest text-xs">Mode:</span>
                <div className="flex gap-2 items-center">
                  <button onClick={() => setStakeMode("time_crunch")} className={`px-2 py-1 font-bold text-xs uppercase border-2 transition ${stakeMode === "time_crunch" ? 'bg-black text-white border-black' : 'bg-white text-black border-black hover:bg-gray-100'}`}>⏱️ Time Crunch</button>
                  <button onClick={() => setStakeMode("one_shot")} className={`px-2 py-1 font-bold text-xs uppercase border-2 transition ${stakeMode === "one_shot" ? 'bg-black text-white border-black' : 'bg-white text-black border-black hover:bg-gray-100'}`}>🎯 One Shot</button>
                </div>
              </div>
              {stakeMode === "time_crunch" && (
                <div className="flex justify-between items-center text-sm">
                  <span className="text-black font-black uppercase tracking-widest text-xs">Timer:</span>
                  <div className="flex gap-3 items-center w-2/3">
                    <input
                      type="range"
                      min="1"
                      max="180"
                      step="1"
                      value={timerDuration}
                      onChange={(e) => setTimerDuration(Number(e.target.value))}
                      className="w-full accent-black bg-gray-200 rounded-none appearance-none cursor-pointer h-2 border-y-2 border-black"
                    />
                    <div className="flex flex-col items-end shrink-0">
                      <div className="flex items-center border-2 border-black bg-white px-2 py-1 shadow-[2px_2px_0_0_#000]">
                        <input
                          type="number"
                          min="1"
                          max="360"
                          step="1"
                          value={timerDuration}
                          onChange={(e) => setTimerDuration(Math.max(1, Math.floor(Number(e.target.value))))}
                          className="bg-transparent text-black font-mono font-black outline-none w-12 text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <span className="text-black font-bold text-xs select-none ml-1">m</span>
                      </div>
                      {timerDuration >= 60 && (
                        <span className="text-[10px] text-black font-bold mt-1">
                          ({Math.floor(timerDuration / 60)}h {timerDuration % 60 > 0 ? `${timerDuration % 60}m` : ''})
                        </span>
                      )}
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
            <h2 className="text-3xl font-black text-white mt-6 mb-2 uppercase tracking-tighter inline-block bg-[#ff3333] px-4 py-1 border-4 border-black shadow-[4px_4px_0_0_#000]">The Blood Pact</h2>
            <p className="text-xs font-bold text-black mb-6 bg-[#ffcc00] px-2 py-1 inline-block border-2 border-black">If you miss your quota before midnight, you incur a massive debt.</p>
            <div className="bg-white border-4 border-black shadow-[4px_4px_0_0_#000] p-4 mb-6 text-left space-y-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-black font-black uppercase tracking-widest text-xs">Length:</span>
                <div className="flex gap-3 items-center w-2/3">
                  <input
                    type="range"
                    min="1"
                    max="100"
                    step="1"
                    value={pactDays}
                    onChange={(e) => setPactDays(Number(e.target.value))}
                    className="w-full accent-[#ff3333] bg-gray-200 rounded-none appearance-none cursor-pointer h-2 border-y-2 border-black"
                  />
                  <div className="flex flex-col items-end shrink-0">
                    <div className="flex items-center border-2 border-black bg-white px-2 py-1 shadow-[2px_2px_0_0_#000]">
                      <input
                        type="number"
                        min="1"
                        max="365"
                        value={pactDays}
                        onChange={(e) => setPactDays(Math.max(1, Number(e.target.value)))}
                        className="bg-transparent text-black font-mono font-black outline-none w-12 text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <span className="text-black font-bold text-xs select-none ml-1">d</span>
                    </div>
                    {pactDays >= 30 && <span className="text-[10px] text-black font-bold mt-1">(~{(pactDays / 30).toFixed(1)}m)</span>}
                  </div>
                </div>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-black font-black uppercase tracking-widest text-xs">Daily Quota:</span>
                <div className="flex items-center gap-3 bg-white border-2 border-black p-1 shadow-[2px_2px_0_0_#000]">
                  <button onClick={() => setPactProblems(Math.max(1, pactProblems - 1))} className="w-6 h-6 bg-black hover:bg-gray-800 text-white font-bold flex items-center justify-center">-</button>
                  <span className="text-black font-mono font-black w-4 text-center">{pactProblems}</span>
                  <button onClick={() => setPactProblems(Math.min(10, pactProblems + 1))} className="w-6 h-6 bg-black hover:bg-gray-800 text-white font-bold flex items-center justify-center">+</button>
                </div>
              </div>
              <div className="flex justify-between items-center text-sm pt-2 border-t-2 border-black">
                <span className="text-[#ff3333] font-black uppercase tracking-widest text-xs">Failure Penalty:</span>
                <div className="flex gap-3 items-center w-2/3">
                  <input
                    type="range"
                    min="0"
                    max="50000"
                    step="100"
                    value={pactPenalty}
                    onChange={(e) => setPactPenalty(Number(e.target.value))}
                    className="w-full accent-[#ff3333] bg-gray-200 rounded-none appearance-none cursor-pointer h-2 border-y-2 border-black"
                  />
                  <div className="flex items-center border-2 border-black bg-[#ff3333] px-2 py-1 shadow-[2px_2px_0_0_#000] shrink-0">
                    <span className="text-white font-black text-xs select-none mr-1">$</span>
                    <input
                      type="number"
                      min="0"
                      value={pactPenalty / 100}
                      onChange={(e) => setPactPenalty(Math.max(0, Math.floor(Number(e.target.value) * 100)))}
                      className="bg-transparent text-white font-mono font-black outline-none w-14 text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>
                </div>
              </div>
            </div>
            <button onClick={() => handleStartContract('blood_pact')} disabled={isCommitting} className="nb-btn nb-btn-danger w-full text-white py-4 mt-4 text-xl">SEAL THE PACT</button>
          </div>
        )}

        {view === 'gauntlet' && (
          <div className="text-center">
            <h2 className="text-3xl font-black text-black mt-6 mb-2 uppercase tracking-tighter inline-block bg-[#ffcc00] px-4 py-1 border-4 border-black shadow-[4px_4px_0_0_#000]">The Gauntlet</h2>
            <p className="text-xs font-bold text-black mb-6 bg-white px-2 py-1 inline-block border-2 border-black">Complete 5 problems back-to-back in under 3 hours. No pauses.</p>
            <div className="bg-white border-4 border-black shadow-[4px_4px_0_0_#000] p-4 mb-6 text-left space-y-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-black font-black uppercase tracking-widest text-xs">Target Problems:</span>
                <div className="flex items-center gap-3 bg-white border-2 border-black p-1 shadow-[2px_2px_0_0_#000]">
                  <button onClick={() => setGauntletProblems(Math.max(1, gauntletProblems - 1))} className="w-6 h-6 bg-black hover:bg-gray-800 text-white font-bold flex items-center justify-center">-</button>
                  <span className="text-black font-mono font-black w-4 text-center">{gauntletProblems}</span>
                  <button onClick={() => setGauntletProblems(Math.min(20, gauntletProblems + 1))} className="w-6 h-6 bg-black hover:bg-gray-800 text-white font-bold flex items-center justify-center">+</button>
                </div>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-black font-black uppercase tracking-widest text-xs">Time Limit:</span>
                <div className="flex gap-3 items-center w-2/3">
                  <input
                    type="range"
                    min="1"
                    max="300"
                    step="1"
                    value={gauntletMinutes}
                    onChange={(e) => setGauntletMinutes(Number(e.target.value))}
                    className="w-full accent-[#ffcc00] bg-gray-200 rounded-none appearance-none cursor-pointer h-2 border-y-2 border-black"
                  />
                  <div className="flex flex-col items-end shrink-0">
                    <div className="flex items-center border-2 border-black bg-white px-2 py-1 shadow-[2px_2px_0_0_#000]">
                      <input
                        type="number"
                        min="1"
                        max="600"
                        step="1"
                        value={gauntletMinutes}
                        onChange={(e) => setGauntletMinutes(Math.max(1, Math.floor(Number(e.target.value))))}
                        className="bg-transparent text-black font-mono font-black outline-none w-14 text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <span className="text-black font-bold text-xs select-none ml-1">m</span>
                    </div>
                    {gauntletMinutes >= 60 && (
                      <span className="text-[10px] text-black font-bold mt-1">
                        ({Math.floor(gauntletMinutes / 60)}h {gauntletMinutes % 60 > 0 ? `${gauntletMinutes % 60}m` : ''})
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex justify-between items-center text-sm pt-2 border-t-2 border-black">
                <span className="text-[#ff3333] font-black uppercase tracking-widest text-xs">Failure Penalty:</span>
                <div className="flex gap-3 items-center w-2/3">
                  <input
                    type="range"
                    min="0"
                    max="50000"
                    step="100"
                    value={pactPenalty}
                    onChange={(e) => setPactPenalty(Number(e.target.value))}
                    className="w-full accent-[#ff3333] bg-gray-200 rounded-none appearance-none cursor-pointer h-2 border-y-2 border-black"
                  />
                  <div className="flex items-center border-2 border-black bg-[#ff3333] px-2 py-1 shadow-[2px_2px_0_0_#000] shrink-0">
                    <span className="text-white font-black text-xs select-none mr-1">$</span>
                    <input
                      type="number"
                      min="0"
                      value={pactPenalty / 100}
                      onChange={(e) => setPactPenalty(Math.max(0, Math.floor(Number(e.target.value) * 100)))}
                      className="bg-transparent text-white font-mono font-black outline-none w-14 text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
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
