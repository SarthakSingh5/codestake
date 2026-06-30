import { useState, useEffect } from 'react';
import type { UIState } from '../types';

interface Props {
  userId: string;
  uiState: UIState;
  setUiState: (state: UIState) => void;
  setActiveSessionId: (id: string) => void;
  setActiveSessionMode: (mode: string) => void;
  setTimerEndMs: (ms: number) => void;
}

export function BettingModal({ userId, uiState, setUiState, setActiveSessionId, setActiveSessionMode, setTimerEndMs }: Props) {
  const [stakeAmount, setStakeAmount] = useState<number>(500);
  const [stakeMode, setStakeMode] = useState<string>("time_crunch");
  const [timerDuration, setTimerDuration] = useState<number>(30);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isCommitting, setIsCommitting] = useState(false);

  useEffect(() => {
    if (uiState === 'MODAL' && userId) {
      setFetchError(null);
      chrome.runtime.sendMessage(
        {
          action: 'fetch_api',
          url: `http://localhost:3000/api/extension/wallet?userId=${userId}`
        },
        (response) => {
          if (chrome.runtime.lastError) {
            setFetchError("Extension communication failed: " + chrome.runtime.lastError.message);
            return;
          }

          if (response?.error) {
            setFetchError(response.error);
            return;
          }

          if (!response?.ok) {
            setFetchError("Server returned " + response?.status);
            return;
          }

          const data = response.data;
          if (data && data.balanceCents !== undefined) {
            setWalletBalance(data.balanceCents);
            if (data.balanceCents < stakeAmount && data.balanceCents > 0) {
              setStakeAmount(100);
            }
          } else {
            setFetchError(data?.error || "Unknown API error");
          }
        }
      );
    }
  }, [uiState, userId]);

  if (uiState !== 'MODAL') return null;

  return (
    <div className="fixed inset-0 z-[99999] bg-black/60 backdrop-blur-sm flex items-center justify-center font-sans">
      <div className="bg-[#0b0f1e] border border-red-500/30 rounded-2xl p-8 max-w-md w-full shadow-2xl shadow-red-900/20 text-center relative overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-600 to-orange-500" />

        <h2 className="text-2xl font-bold text-white mb-2 flex items-center justify-center gap-2">
          <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          Hardcore Mode
        </h2>
        <p className="text-slate-400 text-sm mb-6">
          Configure your challenge below. You must pass all test cases to win.
        </p>

        <div className="bg-white/5 rounded-xl p-4 mb-6 text-left space-y-3">
          <div className="flex justify-between items-center text-sm">
            <span className="text-slate-400">Your Stake:</span>
            <select
              value={stakeAmount}
              onChange={(e) => setStakeAmount(Number(e.target.value))}
              className="bg-black/50 border border-white/10 rounded px-2 py-1 text-white font-mono outline-none focus:border-red-500"
            >
              <option value={100} disabled={walletBalance !== null && walletBalance < 100}>$1.00</option>
              <option value={500} disabled={walletBalance !== null && walletBalance < 500}>$5.00</option>
              <option value={1000} disabled={walletBalance !== null && walletBalance < 1000}>$10.00</option>
              <option value={2000} disabled={walletBalance !== null && walletBalance < 2000}>$20.00</option>
            </select>
          </div>
          <div className="flex justify-between items-center text-sm pt-2 border-t border-white/5">
            <span className="text-slate-400">Challenge Mode:</span>
            <select
              value={stakeMode}
              onChange={(e) => setStakeMode(e.target.value)}
              className="bg-black/50 border border-white/10 rounded px-2 py-1 text-white text-xs outline-none focus:border-red-500"
            >
              <option value="time_crunch">⏱️ Time Crunch</option>
              <option value="one_shot">🎯 One Shot (1 Try)</option>
            </select>
          </div>
          {stakeMode === "time_crunch" && (
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-400">Timer (minutes):</span>
              <input
                type="number"
                min="1"
                max="1440"
                value={timerDuration}
                onChange={(e) => setTimerDuration(Number(e.target.value) || 1)}
                className="bg-black/50 border border-white/10 rounded px-2 py-1 text-white text-xs w-24 text-right outline-none focus:border-red-500"
              />
            </div>
          )}
        </div>

        {fetchError && (
          <div className="text-red-400 text-sm mb-4 bg-red-500/10 border border-red-500/20 py-2 px-3 rounded text-left">
            <strong>Connection Error:</strong> {fetchError}
          </div>
        )}

        {walletBalance === 0 ? (
          <button
            onClick={() => window.open("http://localhost:3000/wallet", "_blank")}
            className="w-full bg-slate-600 hover:bg-slate-500 text-white font-bold py-3 px-4 rounded-lg transition shadow-[0_0_15px_rgba(100,116,139,0.4)] mb-3"
          >
            Add Funds to Wallet
          </button>
        ) : (
          <button
            onClick={async () => {
              if (walletBalance !== null && walletBalance < stakeAmount) {
                alert("Insufficient funds for this stake amount.");
                return;
              }

              setIsCommitting(true);
              try {
                const problemSlug = window.location.pathname.split("/")[2] || "unknown-problem";

                chrome.runtime.sendMessage(
                  {
                    action: 'fetch_api',
                    url: "http://localhost:3000/api/extension/commit",
                    options: {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        userId,
                        problemId: problemSlug,
                        amountCents: stakeAmount,
                        mode: stakeMode,
                        durationMinutes: timerDuration
                      })
                    }
                  },
                  (response) => {
                    setIsCommitting(false);
                    if (chrome.runtime.lastError) {
                      alert("Extension communication failed: " + chrome.runtime.lastError.message);
                      return;
                    }
                    if (response?.error) {
                      alert("Error: " + response.error);
                      return;
                    }
                    if (!response?.ok) {
                      alert("Error: " + (response?.data?.error || "Failed to commit stake"));
                      return;
                    }

                    const newSessionId = response.data.session.id;
                    chrome.runtime.sendMessage({ action: 'mark_session_active', sessionId: newSessionId });

                    setActiveSessionId(newSessionId);
                    setActiveSessionMode(stakeMode);
                    if (stakeMode === 'time_crunch') {
                      setTimerEndMs(Date.now() + timerDuration * 60000);
                    } else {
                      setTimerEndMs(0);
                    }
                    setUiState('TRACKING');
                  }
                );

              } catch (err: any) {
                alert("Error: " + err.message);
                setIsCommitting(false);
              }
            }}
            disabled={isCommitting || walletBalance === null}
            className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-3 px-4 rounded-lg transition shadow-[0_0_15px_rgba(220,38,38,0.4)] mb-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCommitting ? "Committing..." : `Commit $${(stakeAmount / 100).toFixed(2)}`}
          </button>
        )}
        <button
          onClick={() => setUiState('MINIMIZED')}
          className="text-slate-400 hover:text-white text-sm underline transition"
        >
          Cancel & Go Back
        </button>
      </div>
    </div>
  );
}
