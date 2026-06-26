import { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';

type UIState = 'HIDDEN' | 'MINIMIZED' | 'NOTIFICATION' | 'MODAL' | 'UNAUTHENTICATED';

function CodeStakeOverlay() {
  const [uiState, setUiState] = useState<UIState>('HIDDEN'); // Start hidden until we check auth
  const [stakeAmount, setStakeAmount] = useState<number>(500);
  const [stakeMode, setStakeMode] = useState<string>("time_crunch");
  const [timerDuration, setTimerDuration] = useState<number>(30);
  const [userId, setUserId] = useState<string | null>(null);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isCommitting, setIsCommitting] = useState(false);

  // Check auth on load
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

    // Listen for storage changes in case the handshake happens while the tab is open
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

  // Listen for extension icon click to unhide
  useEffect(() => {
    const messageListener = (request: any) => {
      if (request.action === 'toggle_ui') {
        setUiState(prev => {
          if (prev === 'HIDDEN') {
            return userId ? 'MINIMIZED' : 'UNAUTHENTICATED';
          }
          return 'HIDDEN';
        });
      }
    };
    chrome.runtime.onMessage.addListener(messageListener);
    return () => chrome.runtime.onMessage.removeListener(messageListener);
  }, [userId]);

  // Fetch balance when modal opens
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
            // Cap their selected stake if they can't afford the default 500
            if (data.balanceCents < stakeAmount && data.balanceCents > 0) {
              setStakeAmount(100); // Drop down to $1
            }
          } else {
            setFetchError(data?.error || "Unknown API error");
          }
        }
      );
    }
  }, [uiState, userId]);

  if (uiState === 'HIDDEN') {
    return null; // Render absolutely nothing
  }

  // ── 0. Unauthenticated State ──
  if (uiState === 'UNAUTHENTICATED') {
    return (
      <div className="fixed bottom-6 right-6 z-[99999] flex items-end gap-3 font-sans">
        <div className="bg-[#0b0f1e] border border-red-500/30 p-4 rounded-xl shadow-[0_0_20px_rgba(220,38,38,0.2)] text-white w-64 animate-in fade-in slide-in-from-bottom-4 duration-300 relative">
          <button 
            onClick={() => setUiState('HIDDEN')}
            className="absolute top-2 right-2 text-slate-500 hover:text-white transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
          <h3 className="text-sm font-bold text-slate-200 mb-1">CodeStake Setup</h3>
          <p className="text-xs text-slate-400 mb-3">Please link your account to start betting.</p>
          <button 
            onClick={() => {
              // Open the CodeStake website to trigger the silent handshake
              window.open("http://localhost:3000/extension", "_blank");
            }}
            className="w-full bg-slate-100 hover:bg-white text-black font-bold py-1.5 rounded text-sm transition"
          >
            Connect Account
          </button>
        </div>
      </div>
    );
  }

  // ── 1. & 2. The Floating Icon & Notification State ──
  if (uiState === 'NOTIFICATION' || uiState === 'MINIMIZED') {
    return (
      <div className="fixed bottom-6 right-6 z-[99999] flex items-end gap-3 font-sans">
        
        {/* Notification Bubble (Only shows in NOTIFICATION state) */}
        {uiState === 'NOTIFICATION' && (
          <div className="bg-[#0b0f1e] border border-red-500/30 p-4 rounded-xl shadow-[0_0_20px_rgba(220,38,38,0.2)] text-white w-64 animate-in fade-in slide-in-from-bottom-4 duration-300 relative">
            <button 
              onClick={() => setUiState('MINIMIZED')}
              className="absolute top-2 right-2 text-slate-500 hover:text-white transition"
              title="Close notification"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
            <h3 className="text-sm font-bold text-slate-200 mb-1">Want to spice things up?</h3>
            <p className="text-xs text-slate-400 mb-3">Stake real money on this problem.</p>
            <button 
              onClick={() => setUiState('MODAL')}
              className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-1.5 rounded text-sm transition shadow-[0_0_10px_rgba(220,38,38,0.4)]"
            >
              Put money on the table
            </button>
          </div>
        )}

        {/* The Small Floating Icon */}
        <div className="relative flex flex-col items-center">
          <button 
            onClick={() => setUiState('HIDDEN')}
            className="absolute -top-2 -right-2 bg-slate-800 border border-slate-600 rounded-full p-0.5 text-slate-400 hover:text-white hover:bg-red-500 hover:border-red-500 transition z-10"
            title="Hide CodeStake (Click extension icon to restore)"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
          <button 
            onClick={() => setUiState('MODAL')}
            className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(220,38,38,0.6)] hover:scale-105 hover:bg-red-500 transition-all group relative"
          >
            {/* Pulsing ring */}
            <span className="absolute w-full h-full rounded-full border border-red-500 animate-ping opacity-75"></span>
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </button>
        </div>

      </div>
    );
  }

  // ── 3. The Main Wager Modal (Centered) ──
  if (uiState === 'MODAL') {
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
                          problemId: problemSlug, // For now, passing slug as problemId
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
                      
                      // On success
                      alert(`Stake Placed Successfully! (${response.data.session.id})\nTracking will be built later.`);
                      setUiState('MINIMIZED');
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

  return null;
}

// Inject React into the existing website
const root = document.createElement('div');
root.id = 'codestake-extension-root';
document.body.appendChild(root);

createRoot(root).render(<CodeStakeOverlay />);
