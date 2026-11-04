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
    // Sync Anti-Cheat state with the in-page interceptor script
    window.postMessage({ type: 'CODESTAKE_SET_ANTICHEAT', enabled: isAntiCheatActive }, '*');

    // 1. Strict Clipboard Block (paste, copy, cut)
    const blockClipboard = (e: ClipboardEvent) => {
      if (isAntiCheatActive) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
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

    // 2. Strict Keydown Block for Ctrl/Cmd + V, C, X (Cuts off Monaco before it pastes!)
    let keyPressTimestamps: number[] = [];
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isAntiCheatActive) return;

      // Intercept Ctrl+V, Cmd+V, Ctrl+C, Cmd+C, Ctrl+X, Cmd+X
      if (e.ctrlKey || e.metaKey) {
        const key = (e.key || '').toLowerCase();
        const code = e.code || '';
        if (key === 'v' || key === 'c' || key === 'x' || code === 'KeyV' || code === 'KeyC' || code === 'KeyX') {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();

          window.dispatchEvent(new CustomEvent('CODESTAKE_POPUP', {
            detail: {
              type: 'warning',
              title: hasActiveMoneyStake ? '🚨 ANTI-CHEAT ACTIVE' : '⚡ STRICT MODE ACTIVE',
              text: hasActiveMoneyStake
                ? 'Keyboard shortcuts for Copy/Paste are forbidden during an active challenge!'
                : 'Copy/Paste is disabled to simulate real technical interview conditions.'
            }
          }));
          return;
        }
      }

      // Keystroke Velocity Heuristic (Anti-Script / LLM Macro)
      const now = Date.now();
      keyPressTimestamps.push(now);

      if (keyPressTimestamps.length > 10) {
        keyPressTimestamps.shift();
      }

      if (keyPressTimestamps.length === 10) {
        const timeSpan = keyPressTimestamps[9] - keyPressTimestamps[0];
        // 10 characters in less than 70ms = 140+ chars/sec = impossible typing speed (bot/macro injection)
        if (timeSpan < 70) {
          console.warn("Anti-cheat triggered: Keystroke anomaly detected.");
          keyPressTimestamps = [];

          // Revert changes back to official clean boilerplate without losing money
          window.postMessage({ type: 'CODESTAKE_CLEAR_EDITOR' }, '*');

          window.dispatchEvent(new CustomEvent('CODESTAKE_POPUP', {
            detail: {
              type: 'warning',
              title: hasActiveMoneyStake ? '🚨 SCRIPT / MACRO DETECTED' : '⚡ SCRIPT INJECTION DETECTED',
              text: hasActiveMoneyStake
                ? 'Superhuman typing / macro injection detected. All code has been wiped back to boilerplate. Your timer is still ticking!'
                : 'Superhuman typing speed detected. Code has been reset to official boilerplate.'
            }
          }));
        }
      }
    };

    // 3. Strict Drag & Drop Injection Block (Prevents dragging code from split-screen / side tabs)
    const blockDragDrop = (e: DragEvent) => {
      if (isAntiCheatActive) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        window.dispatchEvent(new CustomEvent('CODESTAKE_POPUP', {
          detail: {
            type: 'warning',
            title: hasActiveMoneyStake ? '🚨 ANTI-CHEAT ACTIVE' : '⚡ STRICT MODE ACTIVE',
            text: 'Drag & Drop code injection is forbidden. You must write code manually.'
          }
        }));
      }
    };

    const blockDragOver = (e: DragEvent) => {
      if (isAntiCheatActive) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
      }
    };

    // 4. Strict Context Menu Block (Prevents right-click paste & inspect)
    const blockContextMenu = (e: MouseEvent) => {
      if (isAntiCheatActive) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    // 5. Middle-Click Paste Block (Linux / X11 primary selection paste)
    const blockAuxClick = (e: MouseEvent) => {
      if (isAntiCheatActive && e.button === 1) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    // Attach in capture phase on both window and document to intercept before Monaco
    window.addEventListener("copy", blockClipboard, true);
    window.addEventListener("paste", blockClipboard, true);
    window.addEventListener("cut", blockClipboard, true);
    window.addEventListener("keydown", handleKeyDown, true);
    document.addEventListener("keydown", handleKeyDown, true);
    window.addEventListener("drop", blockDragDrop, true);
    document.addEventListener("drop", blockDragDrop, true);
    window.addEventListener("dragover", blockDragOver, true);
    document.addEventListener("dragover", blockDragOver, true);
    window.addEventListener("contextmenu", blockContextMenu, true);
    document.addEventListener("contextmenu", blockContextMenu, true);
    window.addEventListener("auxclick", blockAuxClick, true);

    return () => {
      window.removeEventListener("copy", blockClipboard, true);
      window.removeEventListener("paste", blockClipboard, true);
      window.removeEventListener("cut", blockClipboard, true);
      window.removeEventListener("keydown", handleKeyDown, true);
      document.removeEventListener("keydown", handleKeyDown, true);
      window.removeEventListener("drop", blockDragDrop, true);
      document.removeEventListener("drop", blockDragDrop, true);
      window.removeEventListener("dragover", blockDragOver, true);
      document.removeEventListener("dragover", blockDragOver, true);
      window.removeEventListener("contextmenu", blockContextMenu, true);
      document.removeEventListener("contextmenu", blockContextMenu, true);
      window.removeEventListener("auxclick", blockAuxClick, true);
    };
  }, [isAntiCheatActive, hasActiveMoneyStake, activeSessionId, userId, setActiveSessionId, setUiState]);
}
