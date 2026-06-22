"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Script from "next/script";

export default function DepositModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [amountString, setAmountString] = useState("5.00");
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

  const amountCents = Math.max(500, Math.floor(parseFloat(amountString || "0") * 100));

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

  const isAmountValid = parseFloat(amountString || "0") >= 5;

  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" />

      <button
        onClick={() => setIsOpen(true)}
        className="mt-auto w-full rounded-lg bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-semibold py-2.5 transition shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:shadow-[0_0_25px_rgba(16,185,129,0.5)]"
      >
        Deposit Funds
      </button>

      {mounted && isOpen && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#0b0f1e] border border-white/10 rounded-2xl w-full max-w-md overflow-hidden flex flex-col shadow-2xl relative">

            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
              <h2 className="text-xl font-bold text-white">Deposit Funds</h2>
              <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white transition">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="p-6">
              <label className="block text-sm font-medium text-slate-400 mb-2">Amount (USD)</label>
              <div className="relative mb-6">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <span className="text-slate-400 text-lg">$</span>
                </div>
                <input
                  type="number"
                  min="5"
                  step="0.01"
                  value={amountString}
                  onChange={(e) => setAmountString(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-8 pr-4 text-white text-lg focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                  placeholder="5.00"
                />
              </div>

              <div className="bg-slate-900/50 rounded-lg p-4 mb-6 text-sm text-slate-300">
                <div className="flex justify-between mb-1">
                  <span>Base Deposit:</span>
                  <span className="font-mono">${isAmountValid ? (amountCents / 100).toFixed(2) : "0.00"}</span>
                </div>
                <div className="flex justify-between mb-1 text-slate-500 text-xs">
                  <span>Processing Fee:</span>
                  <span>Added at checkout</span>
                </div>
                <div className="flex justify-between font-medium text-white pt-2 border-t border-white/10 mt-2">
                  <span>Your Wallet Receives:</span>
                  <span className="font-mono text-emerald-400">${isAmountValid ? (amountCents / 100).toFixed(2) : "0.00"}</span>
                </div>
              </div>

              {!isAmountValid && (
                <p className="text-red-400 text-sm mb-4 text-center">Minimum deposit is $5.00</p>
              )}

              <div className="space-y-3">
                <button
                  onClick={handleRazorpay}
                  disabled={isLoading !== null || !isAmountValid}
                  className="w-full relative py-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading === "razorpay" ? "Loading..." : "Pay with Razorpay (India)"}
                </button>

                <button
                  onClick={handleStripe}
                  disabled={isLoading !== null || !isAmountValid}
                  className="w-full relative py-3 rounded-lg bg-[#635BFF] hover:bg-[#5249e5] text-white font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading === "stripe" ? "Loading..." : "Pay with Stripe (Global)"}
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
