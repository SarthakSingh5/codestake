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

function CodeStakeOverlay() {
  const [uiState, setUiState] = useState<UIState>('HIDDEN');
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [activeSessionMode, setActiveSessionMode] = useState<string>("time_crunch");
  const [timerEndMs, setTimerEndMs] = useState<number | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

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

  // Restore Session on Load
  useEffect(() => {
    if (!userId) return;
    const problemSlug = window.location.pathname.split("/")[2];
    if (!problemSlug) return;

    chrome.runtime.sendMessage(
      {
        action: 'fetch_api',
        url: `http://localhost:3000/api/extension/session?userId=${userId}&problemSlug=${problemSlug}`
      },
      (response) => {
        if (response?.data?.activeSession) {
          const session = response.data.activeSession;
          
          chrome.runtime.sendMessage({ action: 'check_memory_wipe', sessionId: session.id }, (wipeRes) => {
            if (wipeRes?.wiped) {
               chrome.runtime.sendMessage({
                 action: 'fetch_api',
                 url: "http://localhost:3000/api/extension/resolve",
                 options: {
                   method: "POST",
                   headers: { "Content-Type": "application/json" },
                   body: JSON.stringify({ userId, sessionId: session.id, verdict: "CHEATED" })
                 }
               }, () => {
                 alert("🚨 ANTI-CHEAT TRIGGERED: Extension was disabled or browser closed during an active stake! You lost your stake.");
                 setActiveSessionId(null);
                 setUiState('MINIMIZED');
               });
               return; 
            }

            setActiveSessionId(session.id);
            setActiveSessionMode(session.mode);
            if (session.mode === 'time_crunch' && session.expires_at) {
              setTimerEndMs(new Date(session.expires_at).getTime());
            } else {
              setTimerEndMs(0);
            }
            setUiState('TRACKING');
          });
        }
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
              if (data.resolvedAs === "won") {
                alert("🎉 YOU DID IT! Your stake has been refunded to your wallet!");
                setActiveSessionId(null);
                setUiState('MINIMIZED');
              } else if (data.resolvedAs === "lost_one_shot") {
                alert("❌ WRONG ANSWER. You were playing One Shot. Your stake is lost.");
                setActiveSessionId(null);
                setUiState('MINIMIZED');
              } else if (data.resolvedAs === "lost_expired") {
                alert("⌛ TIME'S UP! Your stake is lost.");
                setActiveSessionId(null);
                setUiState('MINIMIZED');
              }
            }
          }
        );
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
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
