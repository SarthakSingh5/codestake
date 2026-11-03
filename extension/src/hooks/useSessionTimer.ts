import { useEffect } from 'react';
import type { UIState } from '../types';

export function useSessionTimer(uiState: UIState, timerEndMs: number | null, activeSessionId: string | null, userId: string | null, setUiState: (state: UIState) => void, setActiveSessionId: (id: string | null) => void) {
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (uiState === 'TRACKING' && timerEndMs && timerEndMs > 0) {
      interval = setInterval(() => {
        const now = Date.now();
        const remaining = Math.max(0, timerEndMs - now);
        if (remaining <= 0) {
          clearInterval(interval);
          if (activeSessionId && userId) {
            chrome.runtime.sendMessage(
              {
                action: 'fetch_api',
                url: "http://localhost:3000/api/extension/resolve",
                options: {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ userId, sessionId: activeSessionId, verdict: "EXPIRED" })
                }
              },
              (response) => {
                if (response?.data?.success && response.data.resolvedAs === "lost_expired") {
                  window.dispatchEvent(new CustomEvent('CODESTAKE_POPUP', { detail: { type: 'fail', text: "Timer Expired. Stake Lost." } }));
                  setActiveSessionId(null);
                  setUiState('MINIMIZED');
                }
              }
            );
          }
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [uiState, timerEndMs, activeSessionId, userId, setActiveSessionId, setUiState]);

  if (!timerEndMs || timerEndMs === 0) return '00:00';
  const remaining = Math.max(0, timerEndMs - Date.now());
  const mins = Math.floor(remaining / 60000);
  const secs = Math.floor((remaining % 60000) / 1000);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}
