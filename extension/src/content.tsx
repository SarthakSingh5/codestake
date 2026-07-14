import { useState, useEffect } from 'react';
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
  const [activeSessionMode, setActiveSessionMode] = useState<string>("time_crunch");
  const [timerEndMs, setTimerEndMs] = useState<number | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [popupMsg, setPopupMsg] = useState<{ type: 'win' | 'fail', text: string, score: number } | null>(null);

  // Initialize Auth
  useEffect(() => {
    if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local) {
      console.warn("CodeStake: Extension context invalidated. Please refresh the page.");
      return;
    }

    chrome.storage.local.get(['userId'], (result) => {
      if (result.userId) {
        setUserId(result.userId as string);
        setUiState('NOTIFICATION');
      } else {
        setUiState('UNAUTHENTICATED');
      }
    });

    const storageListener = (changes: any, namespace: string) => {
      if (namespace === 'local' && changes.userId?.newValue) {
        setUserId(changes.userId.newValue);
        setUiState('NOTIFICATION');
      }
    };

    if (chrome.storage && chrome.storage.onChanged) {
      chrome.storage.onChanged.addListener(storageListener);
      return () => chrome.storage.onChanged.removeListener(storageListener);
    }
  }, []);

  // Restore Session & Run Universal Wipe
  useEffect(() => {
    if (!userId) return;
    const problemSlug = window.location.pathname.split("/")[2];
    if (!problemSlug) return;

    chrome.runtime.sendMessage(
      { action: 'fetch_api', url: `http://localhost:3000/api/extension/session?userId=${userId}&problemSlug=${problemSlug}` },
      (response) => {
        let hasActiveChallenge = false;

        if (response?.data?.activeSession) {
          hasActiveChallenge = true;
          const session = response.data.activeSession;
          setActiveSessionId(session.id);
          setActiveSessionMode(session.mode);
          if (session.mode === 'time_crunch' && session.expires_at) {
            setTimerEndMs(new Date(session.expires_at).getTime());
          } else {
            setTimerEndMs(0);
          }
          setUiState('TRACKING');
        }

        // Also check if they have an active Macro-Stake (Blood Pact / Gauntlet)
        chrome.runtime.sendMessage(
          { action: 'fetch_api', url: `http://localhost:3000/api/extension/contracts?userId=${userId}` },
          (contractRes) => {
            if (contractRes?.data?.contract) {
              hasActiveChallenge = true;
            }

            if (hasActiveChallenge) {
              // Universal Editor Wipe: If you turned the extension off to paste code, it is destroyed now.
              window.postMessage({ type: 'CODESTAKE_CLEAR_EDITOR' }, '*');
            }
          }
        );
      }
    );
  }, [userId]);

  // Listen for extension icon click
  useEffect(() => {
    const messageListener = (request: any) => {
      if (request.action === 'toggle_ui') {
        setUiState(prev => {
          if (prev === 'HIDDEN') {
            if (!userId) return 'UNAUTHENTICATED';
            if (activeSessionId) return 'TRACKING';
            return 'MINIMIZED';
          }
          return 'HIDDEN';
        });
      }
    };
    chrome.runtime.onMessage.addListener(messageListener);
    return () => chrome.runtime.onMessage.removeListener(messageListener);
  }, [userId, activeSessionId]);

  // Listen for Interceptor Verdicts (Win/Loss)
  useEffect(() => {
    const handlePopup = (e: any) => {
      setPopupMsg(e.detail);
    };
    window.addEventListener('CODESTAKE_POPUP', handlePopup);

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'CODESTAKE_SUBMISSION_RESULT') {
        if (!activeSessionId) return;

        const verdict = event.data.verdict;
        console.log("[CodeStake Content] Interceptor reported verdict:", verdict);

        chrome.runtime.sendMessage(
          {
            action: 'fetch_api',
            url: "http://localhost:3000/api/extension/resolve",
            options: {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ userId, sessionId: activeSessionId, verdict: verdict })
            }
          },
          (response) => {
            if (!response?.ok) return;

            const data = response.data;
            if (data.success) {
              if (data.resolvedAs === "won" || data.resolvedAs === "contract_progress") {
                window.dispatchEvent(new CustomEvent('CODESTAKE_POPUP', { detail: { type: 'win', text: "VICTORY: Stake Refunded.", score: data.personaScore } }));
                setActiveSessionId(null);
                setUiState('MINIMIZED');
              } else if (data.resolvedAs === "lost_one_shot") {
                window.dispatchEvent(new CustomEvent('CODESTAKE_POPUP', { detail: { type: 'fail', text: "Wrong Answer. Stake Lost.", score: data.personaScore } }));
                setActiveSessionId(null);
                setUiState('MINIMIZED');
              } else if (data.resolvedAs === "lost_expired") {
                window.dispatchEvent(new CustomEvent('CODESTAKE_POPUP', { detail: { type: 'fail', text: "Timer Expired. Stake Lost.", score: data.personaScore } }));
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
  }, [activeSessionId, userId]);

  // Use Custom Hooks for Logic
  useAntiCheat(uiState, activeSessionId, userId, setActiveSessionId, setUiState);
  const timerString = useSessionTimer(uiState, timerEndMs, activeSessionId, userId, setUiState, setActiveSessionId);

  // Render Layout
  if (uiState === 'HIDDEN') return null;

  return (
    <>
      {uiState === 'UNAUTHENTICATED' && <Unauthenticated setUiState={setUiState} />}

      {(uiState === 'NOTIFICATION' || uiState === 'MINIMIZED') && (
        <NotificationBubble uiState={uiState} setUiState={setUiState} />
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
        />
      )}

      {popupMsg && popupMsg.type === 'win' && (
        <div className="fixed inset-0 z-[999999] bg-black/60 backdrop-blur-sm flex items-center justify-center font-sans">
          <div className="bg-[#0f1a14] border border-green-500/50 rounded-2xl p-8 max-w-md w-full shadow-2xl shadow-green-900/20 text-center relative overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-600 to-emerald-400" />
            <button
              onClick={() => setPopupMsg(null)}
              className="absolute top-4 right-4 text-slate-500 hover:text-green-500 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <h3 className="font-bold text-2xl text-green-400 mb-2 uppercase tracking-wider">
              VICTORY
            </h3>
            <p className="text-slate-300 text-sm mb-6 leading-relaxed">
              "{getDialogue(popupMsg.score || 0, 'win')}"
            </p>
            <button
              onClick={() => setPopupMsg(null)}
              className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-4 rounded-lg transition shadow-[0_0_15px_rgba(34,197,94,0.4)] mb-3 uppercase tracking-wider"
            >
              CLOSE
            </button>
          </div>
        </div>
      )}
      {popupMsg && popupMsg.type === 'fail' && (
        <div className="fixed bottom-6 right-6 z-[999999] animate-in slide-in-from-bottom-5 fade-in duration-300">
          <div className="bg-[#1a0f0f] border border-red-500/50 shadow-red-900/20 text-red-400 p-4 rounded shadow-2xl font-sans w-80 text-left relative overflow-hidden">
            <h3 className="font-bold text-lg mb-1 uppercase tracking-wider">DEFEAT</h3>
            <p className="text-sm opacity-90 mb-4">{popupMsg.text}</p>
            <button onClick={() => setPopupMsg(null)} className="w-full py-2 rounded text-sm font-bold uppercase tracking-widest bg-red-600 hover:bg-red-500 text-white transition-colors">
              Dismiss
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
createRoot(root).render(<CodeStakeOverlay />);
