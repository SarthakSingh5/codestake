"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Script from "next/script";

export default function HonorDebtModal({ debtAmountCents }: { debtAmountCents: number }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState<"stripe" | "razorpay" | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    // Handle browser back button (bfcache)
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        setIsLoading(null);
        setIsOpen(false);
      }
    };

    window.addEventListener('pageshow', handlePageShow);
    return () => {
      window.removeEventListener('pageshow', handlePageShow);
    };
  }, []);

  const amountCents = debtAmountCents;

  const handleStripe = async () => {
    setIsLoading("stripe");
    try {
      const res = await fetch("/api/checkout/stripe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountCents }),
      });
      const data = await res.json();
      if (data.url) {
        // Force the modal to close and reset immediately BEFORE leaving the page
        // This ensures the browser saves a 'clean' state in memory for the back button
        setIsOpen(false);
        setIsLoading(null);

        window.location.href = data.url; // Redirect to Stripe
      } else {
        alert("Failed to initialize Stripe: " + (data.error || "Unknown error"));
        setIsLoading(null);
      }
    } catch (err) {
      console.error(err);
      alert("Something went wrong");
      setIsLoading(null);
    }
  };

  const handleRazorpay = async () => {
    setIsLoading("razorpay");
    try {
      const res = await fetch("/api/checkout/razorpay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountCents }),
      });
      const data = await res.json();

      if (!data.orderId) {
        alert("Failed to initialize Razorpay: " + (data.error || "Unknown error"));
        setIsLoading(null);
        return;
      }

      const options = {
        key: data.keyId,
        amount: data.amount,
        currency: data.currency,
        name: "CodeStake",
        description: `Deposit $${(amountCents / 100).toFixed(2)}`,
        order_id: data.orderId,
        handler: function (response: any) {
          alert("Payment successful! Processing deposit...");
          window.location.reload();
        },
        prefill: {
          name: "CodeStake User",
        },
        theme: {
          color: "#10b981", // Emerald 500
        },
        modal: {
          ondismiss: function () {
            setIsLoading(null);
          }
        }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (err) {
      console.error(err);
      alert("Something went wrong");
      setIsLoading(null);
    }
  };

  // The amount is always valid because it's hardcoded to their exact debt!

  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" />

      <button
        onClick={() => setIsOpen(true)}
        className="mt-auto w-full rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold py-2.5 transition shadow-[0_0_15px_rgba(220,38,38,0.4)] hover:shadow-[0_0_25px_rgba(220,38,38,0.6)] uppercase tracking-wider"
      >
        Honor Debt
      </button>

      {mounted && isOpen && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-[#0b0f1e] border border-red-500/30 rounded-2xl w-full max-w-md overflow-hidden flex flex-col shadow-2xl relative">
            
            {/* Dark red glow */}
            <div className="absolute -top-24 -left-24 w-48 h-48 bg-red-600/20 rounded-full blur-3xl pointer-events-none" />

            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/[0.02] relative z-10">
              <h2 className="text-xl font-bold text-red-500 uppercase tracking-wide">The Code is Broken</h2>
              <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white transition">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="p-6 relative z-10">
              <div className="text-center mb-6">
                <p className="text-slate-300 text-sm mb-4">
                  You made a commitment to yourself, and you broke it. A true engineer stands by their word. Settle your tab to restore your honor.
                </p>
                <div className="text-4xl font-mono font-bold text-white tracking-tight">
                  <span className="text-slate-500 mr-1">$</span>
                  {(amountCents / 100).toFixed(2)}
                </div>
              </div>

              <div className="bg-red-950/30 border border-red-900/50 rounded-lg p-4 mb-6 text-sm text-red-200/70">
                <div className="flex justify-between mb-1">
                  <span>Penalty Due:</span>
                  <span className="font-mono text-red-400">${(amountCents / 100).toFixed(2)}</span>
                </div>
                <div className="flex justify-between mb-1 text-slate-500 text-xs">
                  <span>Processing Fee:</span>
                  <span>Added at checkout</span>
                </div>
              </div>

              <div className="space-y-3">
                <button
                  onClick={handleRazorpay}
                  disabled={isLoading !== null}
                  className="w-full relative py-3 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading === "razorpay" ? "Processing..." : "Pay with Razorpay (India)"}
                </button>

                <button
                  onClick={handleStripe}
                  disabled={isLoading !== null}
                  className="w-full relative py-3 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(220,38,38,0.3)]"
                >
                  {isLoading === "stripe" ? "Processing..." : "Pay with Stripe (Global)"}
                </button>
              </div>
            </div>

          </div>
        </div>,
        document.body
      )}
    </>
  );
}
