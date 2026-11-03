import { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import type { UIState } from './types';
import { useAntiCheat } from './hooks/useAntiCheat';
import { useSessionTimer } from './hooks/useSessionTimer';
import { Unauthenticated } from './components/Unauthenticated';
import { NotificationBubble } from './components/NotificationBubble';
import { ActiveTracker } from './components/ActiveTracker';
import { BettingModal } from './components/BettingModal';
import { getDialogue } from './lib/PersonalityDialogues';

function CodeStakeOverlay() {
  const [uiState, setUiState] = useState<UIState>('HIDDEN');
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [hasActiveContract, setHasActiveContract] = useState<boolean>(false);
  const [strictMode, setStrictMode] = useState<boolean>(false);
  const [activeSessionMode, setActiveSessionMode] = useState<string>("time_crunch");
  const [timerEndMs, setTimerEndMs] = useState<number | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const [popupMsg, setPopupMsg] = useState<{
    type: 'win' | 'progress' | 'fail' | 'warning';
    title?: string;
    items?: Array<{ type: string; text: string }>;
    text?: string;
    score?: number;
  } | null>(null);

  // Derived Anti-Cheat States
  const isAntiCheatActive = Boolean(hasActiveContract || activeSessionId || strictMode);
  const hasActiveMoneyStake = Boolean(hasActiveContract || activeSessionId);

  // Refs to avoid stale closures in event listeners
  const activeSessionIdRef = useRef<string | null>(null);
  const hasActiveContractRef = useRef<boolean>(false);
  const userIdRef = useRef<string | null>(null);

  // Keep refs in sync with state
  useEffect(() => { activeSessionIdRef.current = activeSessionId; }, [activeSessionId]);
  useEffect(() => { hasActiveContractRef.current = hasActiveContract; }, [hasActiveContract]);
  useEffect(() => { userIdRef.current = userId; }, [userId]);

  // Track LeetCode SPA navigation without full page reloads
  useEffect(() => {
    const handleUrlChange = () => {
      if (window.location.pathname !== currentPath) {
        setCurrentPath(window.location.pathname);
      }
    };

    const interval = setInterval(handleUrlChange, 800);
    window.addEventListener('popstate', handleUrlChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener('popstate', handleUrlChange);
    };
  }, [currentPath]);

  // Whenever navigating to a problem and anti-cheat is active, enforce clean boilerplate!
  useEffect(() => {
    const isProblemPage = window.location.pathname.startsWith('/problems/');
    const problemSlug = isProblemPage ? window.location.pathname.split("/")[2] : null;

    if (problemSlug && isAntiCheatActive) {
      console.log('[CodeStake] Enforcing clean boilerplate for problem:', problemSlug);
      window.postMessage({ type: 'CODESTAKE_ENFORCE_BOILERPLATE', problemSlug }, '*');
    }
  }, [currentPath, isAntiCheatActive]);

  // Initialize Auth & Strict Mode from Storage
  useEffect(() => {
    if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local) {
      console.warn("CodeStake: Extension context invalidated. Please refresh the page.");
      return;
    }

    chrome.storage.local.get(['userId', 'strictMode'], (result) => {
      if (result.userId) {
        setUserId(result.userId as string);
        setUiState('MINIMIZED');
      } else {
        setUiState('UNAUTHENTICATED');
      }

      if (result.strictMode !== undefined) {
        setStrictMode(Boolean(result.strictMode));
      }
    });

    const storageListener = (changes: any, namespace: string) => {
      if (namespace === 'local') {
        if (changes.userId?.newValue) {
          setUserId(changes.userId.newValue);
          setUiState('MINIMIZED');
        }
        if (changes.strictMode !== undefined) {
          setStrictMode(Boolean(changes.strictMode.newValue));
        }
      }
    };

    if (chrome.storage && chrome.storage.onChanged) {
      chrome.storage.onChanged.addListener(storageListener);
      return () => chrome.storage.onChanged.removeListener(storageListener);
    }
  }, []);

  // Auto-dismiss popup toasts
  useEffect(() => {
    if (popupMsg) {
      const duration = popupMsg.type === 'progress' ? 5000 : popupMsg.type === 'fail' ? 10000 : 7000;
      const timer = setTimeout(() => {
        setPopupMsg(null);
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [popupMsg]);

  // Restore Session, Check Global Debt & Keep in sync
  const syncStateWithBackend = () => {
    if (!userId) return;

    // Check Macro-Stakes (Blood Pact / Gauntlet)
    chrome.runtime.sendMessage(
      { action: 'fetch_api', url: `http://localhost:3000/api/extension/contracts?userId=${userId}&t=${Date.now()}` },
      (contractRes) => {
        if (contractRes?.data?.contracts && contractRes.data.contracts.length > 0) {
          setHasActiveContract(true);
        } else {
          setHasActiveContract(false);
        }
      }
    );

    // Problem-specific session check
    const isProblemPage = window.location.pathname.startsWith('/problems/');
    const problemSlug = isProblemPage ? window.location.pathname.split("/")[2] : null;

    if (problemSlug) {
      chrome.runtime.sendMessage(
        { action: 'fetch_api', url: `http://localhost:3000/api/extension/session?userId=${userId}&problemSlug=${problemSlug}&t=${Date.now()}` },
        (response) => {
          if (response?.data?.activeSession) {
            const session = response.data.activeSession;
            setActiveSessionId(session.id);
            setActiveSessionMode(session.mode);
            if (session.mode === 'time_crunch' && session.expires_at) {
              setTimerEndMs(new Date(session.expires_at).getTime());
            } else {
              setTimerEndMs(0);
            }
            setUiState('TRACKING');
          } else if (response?.data?.expired || !response?.data?.activeSession) {
            setActiveSessionId(null);
            setUiState(prev => prev === 'TRACKING' ? 'MINIMIZED' : prev);
          }
        }
      );
    }
  };

  useEffect(() => {
    syncStateWithBackend();
  }, [userId]);

  // Tab Focus & Payment listener: re-sync immediately when returning to tab
  useEffect(() => {
    const onFocus = () => syncStateWithBackend();
    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === 'CODESTAKE_PAYMENT_SUCCESS') {
        syncStateWithBackend();
      }
    };
    window.addEventListener('focus', onFocus);
    window.addEventListener('message', onMessage);
    return () => {
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('message', onMessage);
    };
  }, [userId]);



  // Listen for extension icon click — directly opens modal if not actively tracking
  useEffect(() => {
    const messageListener = (request: any) => {
      if (request.action === 'toggle_ui') {
        setUiState(prev => {
          if (!userId) {
            return prev === 'UNAUTHENTICATED' ? 'HIDDEN' : 'UNAUTHENTICATED';
          }
          if (activeSessionId) {
            return prev === 'TRACKING' ? 'HIDDEN' : 'TRACKING';
          }
          // When clicking the extension icon without an active problem session, toggle the modal!
          return prev === 'MODAL' ? 'HIDDEN' : 'MODAL';
        });
      }
    };
    chrome.runtime.onMessage.addListener(messageListener);
    return () => chrome.runtime.onMessage.removeListener(messageListener);
  }, [userId, activeSessionId]);

  // Listen for Interceptor Verdicts (Win/Loss) — uses refs to avoid stale closures
  useEffect(() => {
    const handlePopup = (e: any) => {
      setPopupMsg(e.detail);
    };
    window.addEventListener('CODESTAKE_POPUP', handlePopup);

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'CODESTAKE_SUBMISSION_RESULT') {
        const verdict = event.data.verdict;
        const currentSessionId = activeSessionIdRef.current;
        const currentUserId = userIdRef.current;
        const isProblemPage = window.location.pathname.startsWith('/problems/');
        const currentProblemSlug = event.data?.problemSlug || (isProblemPage ? window.location.pathname.split("/")[2] : null);

        console.log('[CodeStake Content] Interceptor reported verdict:', verdict, '| slug:', currentProblemSlug, '| sessionId:', currentSessionId, '| userId:', currentUserId);

        // Always send to backend if user is logged in — backend decides what to do
        if (!currentUserId) return;

        chrome.runtime.sendMessage(
          {
            action: 'fetch_api',
            url: "http://localhost:3000/api/extension/resolve",
            options: {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                userId: currentUserId,
                sessionId: currentSessionId,
                verdict: verdict,
                problemSlug: currentProblemSlug
              })
            }
          },
          (response) => {
            console.log('[CodeStake Content] Resolve API response:', response);
            if (!response?.ok) {
              console.error('[CodeStake Content] Resolve API failed:', response?.error || response?.data);
              return;
            }

            const data = response.data;
            if (data.success) {
              if (data.resolvedAs === "none") {
                // Silence! Normal practice without active stakes.
                return;
              }

              if (data.resolvedAs === "victory" || data.resolvedAs === "won" || data.resolvedAs === "contract_completed" || data.resolvedAs === "daily_quota_met") {
                window.dispatchEvent(new CustomEvent('CODESTAKE_POPUP', {
                  detail: {
                    type: 'win',
                    title: data.title || "VICTORY",
                    text: data.text || "Problem Solved.",
                    items: data.items || [],
                    score: data.personaScore
                  }
                }));
                setActiveSessionId(null);
                setUiState('MINIMIZED');
              } else if (data.resolvedAs === "progress" || data.resolvedAs === "contract_progress") {
                window.dispatchEvent(new CustomEvent('CODESTAKE_POPUP', {
                  detail: {
                    type: 'progress',
                    title: data.title || "CHALLENGE PROGRESS",
                    text: data.text || "Target advancing.",
                    items: data.items || [],
                    score: data.personaScore
                  }
                }));
                setActiveSessionId(null);
                setUiState('MINIMIZED');
              } else if (data.resolvedAs === "duplicate_solve") {
                window.dispatchEvent(new CustomEvent('CODESTAKE_POPUP', {
                  detail: {
                    type: 'warning',
                    title: data.title || 'DUPLICATE SOLVE',
                    text: data.text || "You have already credited this problem for your active challenge. Solve a distinct problem to advance!",
                    items: data.items || []
                  }
                }));
                setUiState('MINIMIZED');
              } else if (data.resolvedAs === "lost_one_shot" || data.resolvedAs === "lost_expired") {
                window.dispatchEvent(new CustomEvent('CODESTAKE_POPUP', {
                  detail: {
                    type: 'fail',
                    title: data.title || 'DEFEAT',
                    text: data.text || "Stake Lost.",
                    items: data.items || [],
                    score: data.personaScore
                  }
                }));
                setActiveSessionId(null);
                setUiState('MINIMIZED');
              }
            }
          }
        );
      }
    };
    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
      window.removeEventListener('CODESTAKE_POPUP', handlePopup);
    };
  }, [activeSessionId, userId, hasActiveContract]);

  // Use Custom Hooks for Logic
  useAntiCheat(isAntiCheatActive, hasActiveMoneyStake, activeSessionId, userId, setActiveSessionId, setUiState);
  const timerString = useSessionTimer(uiState, timerEndMs, activeSessionId, userId, setUiState, setActiveSessionId);

  // Render Layout
  return (
    <>
      {uiState === 'UNAUTHENTICATED' && <Unauthenticated setUiState={setUiState} />}

      {!popupMsg && (uiState === 'NOTIFICATION' || uiState === 'MINIMIZED') && (
        <NotificationBubble uiState={uiState} setUiState={setUiState} isAntiCheatActive={isAntiCheatActive} />
      )}

      {uiState === 'TRACKING' && (
        <ActiveTracker activeSessionMode={activeSessionMode} timerString={timerString} setUiState={setUiState} />
      )}

      {uiState === 'MODAL' && userId && (
        <BettingModal
          userId={userId}
          uiState={uiState}
          setUiState={setUiState}
          setActiveSessionId={setActiveSessionId}
          setActiveSessionMode={setActiveSessionMode}
          setTimerEndMs={setTimerEndMs}
          setHasActiveContract={setHasActiveContract}
          strictMode={strictMode}
          setStrictMode={setStrictMode}
          hasActiveMoneyStake={hasActiveMoneyStake}
          isAntiCheatActive={isAntiCheatActive}
        />
      )}

      {popupMsg && popupMsg.type === 'win' && (
        <div className="fixed bottom-6 right-6 z-[999999] animate-in slide-in-from-bottom-5 fade-in duration-300 font-sans">
          <div className="nb-box p-4 w-96 max-w-sm text-left relative overflow-hidden border-4 border-black shadow-[6px_6px_0_0_#000] bg-white">
            <div className="absolute top-0 left-0 w-full h-2 bg-[#00ff66] border-b-4 border-black" />
            <div className="flex justify-between items-center mt-2 mb-2">
              <h3 className="font-black text-sm uppercase tracking-wider text-black bg-[#00ff66] px-2 py-0.5 border-2 border-black shadow-[2px_2px_0_0_#000] flex items-center gap-1.5">
                <span>🏆</span> {popupMsg.title || "VICTORY"}
              </h3>
              <button
                onClick={() => setPopupMsg(null)}
                className="text-black hover:bg-[#00ff66] border-2 border-transparent hover:border-black p-0.5 transition"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>

            {popupMsg.items && popupMsg.items.length > 0 && (
              <div className="mb-2.5 bg-emerald-50/60 p-2.5 border-2 border-black space-y-1.5 shadow-[2px_2px_0_0_#000]">
                {popupMsg.items.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-xs">
                    <span className={item.type === 'victory' ? 'text-emerald-700 font-black' : 'text-blue-600 font-black'}>
                      {item.type === 'victory' ? '★' : '•'}
                    </span>
                    <span className={item.type === 'victory' ? 'text-black font-black' : 'text-black/85 font-bold'}>
                      {item.text}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <p className="text-[11px] font-bold text-black/75 italic mb-3 bg-gray-50 p-2 border-2 border-black">
              "{getDialogue(popupMsg.score || 0, 'win')}"
            </p>

            <button
              onClick={() => setPopupMsg(null)}
              className="nb-btn nb-btn-primary w-full py-2 text-xs font-black uppercase tracking-widest text-black"
            >
              CLAIM GLORY
            </button>
          </div>
        </div>
      )}

      {popupMsg && popupMsg.type === 'progress' && (
        <div className="fixed bottom-6 right-6 z-[999999] animate-in slide-in-from-bottom-5 fade-in duration-300 font-sans">
          <div className="nb-box p-4 w-96 max-w-sm text-left relative overflow-hidden border-4 border-black shadow-[6px_6px_0_0_#000] bg-white">
            <div className="absolute top-0 left-0 w-full h-2 bg-[#ffcc00] border-b-4 border-black" />
            <div className="flex justify-between items-center mt-2 mb-2">
              <h3 className="font-black text-sm uppercase tracking-wider text-black bg-[#ffcc00] px-2 py-0.5 border-2 border-black shadow-[2px_2px_0_0_#000] flex items-center gap-1.5">
                <span>📈</span> {popupMsg.title || "CHALLENGE PROGRESS"}
              </h3>
              <button
                onClick={() => setPopupMsg(null)}
                className="text-black hover:bg-[#ffcc00] border-2 border-transparent hover:border-black p-0.5 transition"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>

            {popupMsg.items && popupMsg.items.length > 0 && (
              <div className="mb-2.5 bg-amber-50/60 p-2.5 border-2 border-black space-y-1.5 shadow-[2px_2px_0_0_#000]">
                {popupMsg.items.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-xs font-bold text-black">
                    <span className="text-amber-600 font-black">✦</span>
                    <span>{item.text}</span>
                  </div>
                ))}
              </div>
            )}

            <p className="text-[11px] font-bold text-black/75 mb-3 bg-gray-50 p-2 border-2 border-black">
              Target advancing. Keep solving to complete your challenge.
            </p>

            <button
              onClick={() => setPopupMsg(null)}
              className="nb-btn w-full py-2 text-xs font-black uppercase tracking-widest text-black bg-[#ffcc00] hover:bg-[#e6b800]"
            >
              CONTINUE SOLVING
            </button>
          </div>
        </div>
      )}
      {popupMsg && popupMsg.type === 'fail' && (
        <div className="fixed bottom-6 right-6 z-[999999] animate-in slide-in-from-bottom-5 fade-in duration-300 font-sans">
          <div className="nb-box p-4 w-80 text-left relative overflow-hidden border-4 border-black shadow-[6px_6px_0_0_#000] bg-white">
            <div className="absolute top-0 left-0 w-full h-2 bg-[#ff3333] border-b-4 border-black" />
            <div className="flex justify-between items-center mt-2 mb-2">
              <h3 className="font-black text-lg uppercase tracking-wider text-white bg-[#ff3333] px-2 py-0.5 border-2 border-black shadow-[2px_2px_0_0_#000]">
                DEFEAT
              </h3>
              <button
                onClick={() => setPopupMsg(null)}
                className="text-black hover:bg-[#ff3333] border-2 border-transparent hover:border-black p-0.5 transition"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>
            <p className="text-xs font-bold text-black/80 mb-4 bg-gray-100 p-2 border-2 border-black">
              {popupMsg.text}
            </p>
            <button
              onClick={() => setPopupMsg(null)}
              className="nb-btn nb-btn-danger w-full py-2 text-xs font-black uppercase tracking-widest text-white"
            >
              DISMISS
            </button>
          </div>
        </div>
      )}

      {popupMsg && popupMsg.type === 'warning' && (
        <div className="fixed bottom-6 right-6 z-[999999] animate-in slide-in-from-bottom-5 fade-in duration-300 font-sans">
          <div className="nb-box p-4 w-88 max-w-sm text-left relative overflow-hidden border-4 border-black shadow-[6px_6px_0_0_#000] bg-white">
            <div className="absolute top-0 left-0 w-full h-2 bg-[#ffaa00] border-b-4 border-black" />
            <div className="flex justify-between items-center mt-2 mb-2">
              <h3 className="font-black text-sm uppercase tracking-wider text-black bg-[#ffaa00] px-2 py-0.5 border-2 border-black shadow-[2px_2px_0_0_#000]">
                {popupMsg.title || "DUPLICATE SOLVE"}
              </h3>
              <button
                onClick={() => setPopupMsg(null)}
                className="text-black hover:bg-[#ffaa00] border-2 border-transparent hover:border-black p-0.5 transition"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>
            <p className="text-xs font-bold text-black/90 mb-4 bg-amber-50 p-2.5 border-2 border-black leading-relaxed">
              {popupMsg.text}
            </p>
            <button
              onClick={() => setPopupMsg(null)}
              className="nb-btn w-full py-2 text-xs font-black uppercase tracking-widest text-black bg-[#ffaa00] hover:bg-[#e69900]"
            >
              UNDERSTOOD
            </button>
          </div>
        </div>
      )}
    </>
  );
}

// Inject the Interceptor Script into the page DOM
const script = document.createElement('script');
script.src = chrome.runtime.getURL('src/interceptor.js');
script.onload = () => {
  script.remove();
};
(document.head || document.documentElement).appendChild(script);

// Inject React into the existing website
const root = document.createElement('div');
root.id = 'codestake-extension-root';
document.body.appendChild(root);
createRoot(root).render(<CodeStakeOverlay />);
