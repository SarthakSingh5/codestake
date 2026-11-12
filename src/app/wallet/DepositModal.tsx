"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";

export default function HonorDebtModal({ debtAmountCents }: { debtAmountCents: number }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    // Handle browser back button (bfcache)
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        setIsLoading(false);
        setIsOpen(false);
        setError(null);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
        setError(null);
      }
    };

    window.addEventListener("pageshow", handlePageShow);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("pageshow", handlePageShow);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const amountCents = debtAmountCents;

  const handleStripe = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout/stripe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountCents }),
      });
      const data = await res.json();
      if (data.url) {
        setIsOpen(false);
        setIsLoading(false);
        window.location.href = data.url; // Redirect to Stripe
      } else {
        setError(data.error || "Failed to initialize Stripe checkout.");
        setIsLoading(false);
      }
    } catch (err) {
      console.error(err);
      setError("Network connection error. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => {
          setError(null);
          setIsOpen(true);
        }}
        className="nb-btn nb-btn-danger mt-auto w-full py-4 text-white text-base sm:text-lg tracking-[0.2em] font-black uppercase shadow-[4px_4px_0_0_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_0_#000] transition-all"
      >
        RESTORE HONOR
      </button>

      {mounted && isOpen && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="nb-box p-6 sm:p-8 max-w-md w-full text-center relative overflow-hidden bg-white border-8 border-black shadow-[12px_12px_0_0_#000] animate-in zoom-in-95 duration-200">
            <div className="absolute top-0 left-0 w-full h-2 bg-[#ff3333] border-b-4 border-black" />
            
            <button
              onClick={() => {
                setIsOpen(false);
                setError(null);
              }}
              className="absolute top-4 right-4 text-black hover:bg-[#ff3333] hover:text-white border-2 border-black transition-colors z-50 p-1 shadow-[2px_2px_0_0_#000]"
              title="Close"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="py-4 px-2 text-center mb-2">
              <span className="inline-block bg-[#ff3333] text-white font-black text-xs uppercase px-2.5 py-1 border-2 border-black tracking-widest shadow-[2px_2px_0_0_#000] mb-3">
                Accountability Breach
              </span>
              <h2 className="text-black font-black uppercase text-2xl sm:text-3xl leading-snug tracking-tighter bg-[#ffcc00] p-2 border-4 border-black shadow-[4px_4px_0_0_#000]">
                THE CODE IS BROKEN
              </h2>
            </div>

            <p className="text-black font-bold text-xs sm:text-sm mb-5 bg-white border-2 border-black p-3.5 shadow-[2px_2px_0_0_#000] text-left leading-relaxed">
              You pledged a stake on your algorithmic skills and missed the deadline. Settle your balance to lift your banishment and re-enter the arena.
            </p>

            <div className="bg-white border-4 border-black p-3.5 mb-5 flex justify-between items-center text-sm shadow-[4px_4px_0_0_#000]">
              <span className="text-black uppercase tracking-widest text-xs font-black">Penalty Due</span>
              <span className="text-black font-mono font-black text-2xl">${(amountCents / 100).toFixed(2)} <span className="text-xs font-sans text-gray-600">USD</span></span>
            </div>

            {error && (
              <div className="text-xs font-black uppercase text-white bg-[#ff3333] p-3 border-2 border-black shadow-[3px_3px_0_0_#000] mb-4 text-left">
                ⚠️ {error}
              </div>
            )}

            <div className="space-y-3 text-left">
              <button
                onClick={handleStripe}
                disabled={isLoading}
                className="nb-btn nb-btn-danger w-full py-4 text-white text-base font-black uppercase tracking-widest shadow-[4px_4px_0_0_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0_0_#000] disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent animate-spin rounded-full" />
                    <span>GENERATING CHECKOUT...</span>
                  </>
                ) : (
                  <span>💳 PAY VIA CARD / APPLE PAY (STRIPE)</span>
                )}
              </button>
              <p className="text-[11px] text-gray-500 font-bold uppercase tracking-wider text-center">
                Instant 256-bit encrypted checkout via Stripe Global.
              </p>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
