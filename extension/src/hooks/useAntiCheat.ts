import { useEffect } from 'react';
import type { UIState } from '../types';

export function useAntiCheat(
  isAntiCheatActive: boolean,
  hasActiveMoneyStake: boolean,
  activeSessionId: string | null,
  userId: string | null,
  setActiveSessionId: (id: string | null) => void,
  setUiState: (state: UIState) => void
) {
  useEffect(() => {
    // 1. Strict Clipboard Block
    const blockClipboard = (e: ClipboardEvent) => {
      if (isAntiCheatActive) {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('CODESTAKE_POPUP', {
          detail: {
            type: 'warning',
            title: hasActiveMoneyStake ? '🚨 ANTI-CHEAT ACTIVE' : '⚡ STRICT MODE ACTIVE',
            text: hasActiveMoneyStake
              ? 'Copy/Paste is forbidden during an active challenge or stake!'
              : 'Copy/Paste is disabled to simulate real technical interview conditions.'
          }
        }));
      }
    };

    // 2. Keystroke Velocity Heuristic (Anti-Script / LLM Macro)
    let keyPressTimestamps: number[] = [];
    const handleKeyDown = () => {
      if (!isAntiCheatActive) return;

      const now = Date.now();
      keyPressTimestamps.push(now);

      // Keep sliding window of last 10 keystrokes
      if (keyPressTimestamps.length > 10) {
        keyPressTimestamps.shift();
      }

      if (keyPressTimestamps.length === 10) {
        const timeSpan = keyPressTimestamps[9] - keyPressTimestamps[0];
        // 10 characters in less than 70ms = 140+ chars/sec = impossible typing speed (bot/macro injection)
        if (timeSpan < 70) {
          console.warn("Anti-cheat triggered: Keystroke anomaly detected.");
          keyPressTimestamps = [];

          if (hasActiveMoneyStake && userId) {
            // Trigger forfeiture of active stake
            chrome.runtime.sendMessage({
              action: 'fetch_api',
              url: "http://localhost:3000/api/extension/resolve",
              options: {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId, sessionId: activeSessionId, verdict: "CHEATED" })
              }
            }, () => {
              window.dispatchEvent(new CustomEvent('CODESTAKE_POPUP', {
                detail: {
                  type: 'fail',
                  title: 'DEFEAT: CHEATED',
                  text: 'Superhuman typing speed / macro injection detected. You lost your stake.'
                }
              }));
              setActiveSessionId(null);
              setUiState('MINIMIZED');
            });
          } else {
            // Casual Interview Mode: Wipe back to clean boilerplate and warn
            window.postMessage({ type: 'CODESTAKE_CLEAR_EDITOR' }, '*');
            window.dispatchEvent(new CustomEvent('CODESTAKE_POPUP', {
              detail: {
                type: 'warning',
                title: '⚡ SCRIPT INJECTION DETECTED',
                text: 'Superhuman typing speed detected. Code has been reset to official boilerplate.'
              }
            }));
          }
        }
      }
    };

    window.addEventListener("copy", blockClipboard, true);
    window.addEventListener("paste", blockClipboard, true);
    window.addEventListener("cut", blockClipboard, true);
    window.addEventListener("keydown", handleKeyDown, true);

    return () => {
      window.removeEventListener("copy", blockClipboard, true);
      window.removeEventListener("paste", blockClipboard, true);
      window.removeEventListener("cut", blockClipboard, true);
      window.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [isAntiCheatActive, hasActiveMoneyStake, activeSessionId, userId, setActiveSessionId, setUiState]);
}
