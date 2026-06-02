"use client";

import { useState } from "react";
import Script from "next/script";

export default function DepositModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [amountCents, setAmountCents] = useState(500); // Default $5.00
  const [isLoading, setIsLoading] = useState<"stripe" | "razorpay" | null>(null);

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
        description: `Deposit ${amountCents} CodeStake Credits`,
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
          ondismiss: function() {
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

  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" />
      
      <button 
        onClick={() => setIsOpen(true)}
        className="mt-auto w-full rounded-lg bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-semibold py-2.5 transition shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:shadow-[0_0_25px_rgba(16,185,129,0.5)]"
      >
        Add Credits
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#0b0f1e] border border-white/10 rounded-2xl w-full max-w-md overflow-hidden flex flex-col shadow-2xl relative">
            
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
              <h2 className="text-xl font-bold text-white">Deposit Credits</h2>
              <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white transition">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="p-6">
              <label className="block text-sm font-medium text-slate-400 mb-2">Select Amount</label>
              <div className="grid grid-cols-3 gap-3 mb-6">
                {[500, 1000, 2000].map(amt => (
                  <button
                    key={amt}
                    onClick={() => setAmountCents(amt)}
                    className={`py-2 rounded-lg font-medium text-sm transition ${
                      amountCents === amt 
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50' 
                        : 'bg-white/5 text-slate-300 border border-transparent hover:bg-white/10'
                    }`}
                  >
                    {amt} Credits
                  </button>
                ))}
              </div>

              <div className="bg-slate-900/50 rounded-lg p-4 mb-6 text-sm text-slate-300">
                <div className="flex justify-between mb-1">
                  <span>Base Amount:</span>
                  <span className="font-mono">{amountCents} Credits</span>
                </div>
                <div className="flex justify-between mb-1 text-slate-500 text-xs">
                  <span>Processing Fee:</span>
                  <span>Passed to user at checkout</span>
                </div>
                <div className="flex justify-between font-medium text-white pt-2 border-t border-white/10 mt-2">
                  <span>You Receive:</span>
                  <span className="font-mono text-emerald-400">{amountCents} Credits</span>
                </div>
              </div>

              <div className="space-y-3">
                <button 
                  onClick={handleRazorpay}
                  disabled={isLoading !== null}
                  className="w-full relative py-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold transition disabled:opacity-50"
                >
                  {isLoading === "razorpay" ? "Loading..." : "Pay with Razorpay (India)"}
                </button>
                
                <button 
                  onClick={handleStripe}
                  disabled={isLoading !== null}
                  className="w-full relative py-3 rounded-lg bg-[#635BFF] hover:bg-[#5249e5] text-white font-semibold transition disabled:opacity-50"
                >
                  {isLoading === "stripe" ? "Loading..." : "Pay with Stripe (Global)"}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </>
  );
}
