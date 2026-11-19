import { useState, useEffect } from 'react';
import type { UIState } from '../types';
import { API_BASE_URL } from '../config';

export function useSessionTimer(
  _uiState: UIState,
  timerEndMs: number | null,
  activeSessionId: string | null,
  userId: string | null,
  setUiState: (state: UIState) => void,
  setActiveSessionId: (id: string | null) => void,
  onExpired?: () => void
) {
  const [timeLeftMs, setTimeLeftMs] = useState<number>(() =>
    timerEndMs ? Math.max(0, timerEndMs - Date.now()) : 0
  );

  useEffect(() => {
    if (!timerEndMs || timerEndMs <= 0) {
      setTimeLeftMs(0);
      return;
    }

    const checkTime = () => {
      const now = Date.now();
      const remaining = Math.max(0, timerEndMs - now);
      setTimeLeftMs(remaining);

      if (remaining <= 0) {
        if (activeSessionId && userId) {
          chrome.runtime.sendMessage(
            {
              action: 'fetch_api',
              url: `${API_BASE_URL}/api/extension/resolve`,
              options: {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, sessionId: activeSessionId, verdict: 'EXPIRED' })
              }
            },
            (response) => {
              if (response?.data?.success && response.data.resolvedAs === 'lost_expired') {
                const items = response.data.items && response.data.items.length > 0
                  ? response.data.items
                  : [{ type: 'defeat', text: response.data.text || 'Timer Expired. Stake Lost.' }];

                window.dispatchEvent(
                  new CustomEvent('CODESTAKE_POPUP', {
                    detail: {
                      type: 'fail',
                      title: response.data.title || 'DEFEAT',
                      text: response.data.text || 'Timer Expired. Stake Lost.',
                      items: items,
                      score: response.data.personaScore
                    }
                  })
                );
                setActiveSessionId(null);
                setUiState('MINIMIZED');
                onExpired?.();
              }
            }
          );
        }
      }
    };

    checkTime();
    const interval = setInterval(checkTime, 1000);
    return () => clearInterval(interval);
  }, [timerEndMs, activeSessionId, userId, setActiveSessionId, setUiState, onExpired]);

  if (!timerEndMs || timerEndMs <= 0) return '00:00';
  const totalSeconds = Math.floor(timeLeftMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');

  if (hours > 0) {
    return `${pad(hours)}:${pad(mins)}:${pad(secs)}`;
  }
  return `${pad(mins)}:${pad(secs)}`;
}
