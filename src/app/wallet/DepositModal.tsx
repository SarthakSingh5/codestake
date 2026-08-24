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
        className="nb-btn nb-btn-danger mt-auto w-full py-4 text-white text-lg tracking-[0.2em]"
      >
        RESTORE HONOR
      </button>

      {mounted && isOpen && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-white/90 backdrop-blur-sm">
          <div className="nb-box p-8 max-w-md w-full text-center relative overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="absolute top-0 left-0 w-full h-2 bg-[#ff3333] border-b-4 border-black" />
            
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 text-black hover:bg-[#ff3333] border-2 border-transparent hover:border-black transition-colors z-50 p-1"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="py-8 px-2 text-center mb-4">
              <h2 className="text-black font-black uppercase text-3xl leading-snug tracking-tighter bg-[#ff3333] text-white p-2 border-4 border-black shadow-[4px_4px_0_0_#000]">
                THE CODE IS BROKEN
              </h2>
            </div>

            <p className="text-black font-bold text-sm mb-6 bg-white border-2 border-black p-4 shadow-[2px_2px_0_0_#000]">
              You made a commitment to yourself, and you broke it. A true engineer stands by their word. Settle your tab to restore your honor.
            </p>

            <div className="bg-white border-4 border-black p-4 mb-6 flex justify-between items-center text-sm shadow-[4px_4px_0_0_#000]">
              <span className="text-black uppercase tracking-widest text-xs font-black">Penalty Due</span>
              <span className="text-black font-mono font-black text-2xl">${(amountCents / 100).toFixed(2)}</span>
            </div>

            <div className="space-y-4">
              <button
                onClick={handleRazorpay}
                disabled={isLoading !== null}
                className="nb-btn w-full py-3 px-4 text-sm bg-[#ffcc00] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading === "razorpay" ? "PROCESSING..." : "PAY WITH RAZORPAY (INDIA)"}
              </button>

              <button
                onClick={handleStripe}
                disabled={isLoading !== null}
                className="nb-btn nb-btn-primary w-full py-3 px-4 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading === "stripe" ? "PROCESSING..." : "PAY WITH STRIPE (GLOBAL)"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
