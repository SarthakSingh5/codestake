import { useEffect } from 'react';
import type { UIState } from '../types';

export function useAntiCheat(
  uiState: UIState,
  activeSessionId: string | null,
  userId: string | null,
  setActiveSessionId: (id: string | null) => void,
  setUiState: (state: UIState) => void
) {
  useEffect(() => {
    if (uiState !== 'TRACKING' || !activeSessionId || !userId) return;

    const blockClipboard = (e: ClipboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
    };

    const blockShortcuts = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && ['c', 'v', 'x'].includes(e.key.toLowerCase())) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
      }
    };

    // Typing Speed Trap
    let keyPressTimestamps: number[] = [];
    const handleTypingSpeed = (e: KeyboardEvent) => {
      if (['Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'Tab'].includes(e.key)) return;

      const now = Date.now();
      keyPressTimestamps.push(now);
      
      if (keyPressTimestamps.length > 15) {
        keyPressTimestamps.shift();
      }

      if (keyPressTimestamps.length === 15) {
        const timeFor15Chars = keyPressTimestamps[14] - keyPressTimestamps[0];
        if (timeFor15Chars < 200) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          
          chrome.runtime.sendMessage({
            action: 'fetch_api',
            url: "http://localhost:3000/api/extension/resolve",
            options: {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ userId, sessionId: activeSessionId, verdict: "CHEATED" })
            }
          }, () => {
            alert("🚨 ANTI-CHEAT TRIGGERED: Superhuman typing speed detected. You lost your stake.");
            setActiveSessionId(null);
            setUiState('MINIMIZED');
          });
          keyPressTimestamps = []; 
        }
      }
    };

    window.addEventListener("copy", blockClipboard, true);
    window.addEventListener("paste", blockClipboard, true);
    window.addEventListener("cut", blockClipboard, true);
    window.addEventListener("keydown", blockShortcuts, true);
    window.addEventListener("keydown", handleTypingSpeed, true);

    return () => {
      window.removeEventListener("copy", blockClipboard, true);
      window.removeEventListener("paste", blockClipboard, true);
      window.removeEventListener("cut", blockClipboard, true);
      window.removeEventListener("keydown", blockShortcuts, true);
      window.removeEventListener("keydown", handleTypingSpeed, true);
    };
  }, [uiState, activeSessionId, userId, setActiveSessionId, setUiState]);
}
