"use client";

import { useEffect, useState, Suspense, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { loadRazorpay } from "@/lib/loadRazorpay";

function EmbedContent() {
  const searchParams = useSearchParams();
  const rawUserId = searchParams.get('userId');
  const rawAmount = searchParams.get('amount');
  const parsedAmount = parseInt(rawAmount || '0', 10);

  const [activeAmount, setActiveAmount] = useState<number>(parsedAmount);
  const [activeUserId, setActiveUserId] = useState<string>(rawUserId || "");
  const [status, setStatus] = useState("Initializing Secure Checkout...");
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const hasTriggeredInitial = useRef(false);

  const initRazorpay = useCallback(async (customAmount?: number, customUserId?: string) => {
    const targetAmount = customAmount !== undefined ? customAmount : activeAmount;
    const targetUserId = customUserId || activeUserId;

    if (!targetUserId) {
      setError("Missing User ID. Please open from the CodeStake Extension or Log In.");
      return;
    }

    if (isNaN(targetAmount) || targetAmount <= 0) {
      setError("No outstanding debt found ($0.00 due). Your standing is clean!");
      return;
    }

    setIsProcessing(true);
    setError(null);
    setStatus("Loading Razorpay SDK...");

    const isLoaded = await loadRazorpay();
    if (!isLoaded || !(window as any).Razorpay) {
      setIsProcessing(false);
      setError("Could not load Razorpay SDK. Please check your connection or ad-blocker.");
      return;
    }

    setStatus("Generating UPI / Netbanking Order...");

    try {
      const res = await fetch("/api/extension/checkout/razorpay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountCents: targetAmount, userId: targetUserId }),
      });
      const data = await res.json();

      if (!data.orderId) {
        setIsProcessing(false);
        setError("Failed to create order: " + (data.error || "Unknown server error"));
        return;
      }

      setStatus("Awaiting payment in Razorpay modal...");
      const options = {
        key: data.keyId,
        amount: data.amount,
        currency: data.currency,
        name: "CodeStake",
        description: `Clear Debt $${(targetAmount / 100).toFixed(2)} USD`,
        order_id: data.orderId,
        handler: async function (response: any) {
          setStatus("Payment Captured! Verifying signature & settling debt...");
          try {
            await fetch("/api/checkout/razorpay/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                userId: targetUserId,
                amountCents: targetAmount,
              }),
            });
            window.parent.postMessage({ type: 'CODESTAKE_PAYMENT_SUCCESS' }, '*');
          } catch (e) {
            console.error("Verification call error:", e);
          }
          setTimeout(() => {
            window.location.href = '/payment-success';
          }, 400);
        },
        prefill: {
          name: "CodeStake User",
        },
        theme: {
          color: "#000000",
        },
        config: {
          display: {
            blocks: {
              upi: {
                name: "Pay via UPI QR (PhonePe / GPay / Paytm)",
                instruments: [
                  {
                    method: "upi",
                    flows: ["qr"]
                  }
                ]
              }
            },
            sequence: ["block.upi"],
            preferences: {
              show_default_blocks: true,
            },
          }
        },
        modal: {
          ondismiss: function () {
            setIsProcessing(false);
            setStatus("Checkout window closed.");
            setError("Checkout was closed. You can re-open it below.");
            try {
              window.parent.postMessage({ type: 'CODESTAKE_PAYMENT_DISMISSED' }, '*');
            } catch {}
          }
        }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (err: any) {
      setIsProcessing(false);
      console.error(err);
      setError("Network connection error. Please try again.");
    }
  }, [activeAmount, activeUserId]);

  useEffect(() => {
    if (!hasTriggeredInitial.current) {
      hasTriggeredInitial.current = true;
      if (rawUserId && parsedAmount > 0) {
        initRazorpay(parsedAmount, rawUserId);
      } else if (!rawUserId) {
        setError("Missing User ID. Please open from the CodeStake Extension or Log In.");
      } else {
        setError("No outstanding debt found ($0.00 due). Your standing is clean!");
      }
    }
  }, [rawUserId, parsedAmount, initRazorpay]);

  const handleTestDemoPay = () => {
    const demoAmount = 500; // $5.00
    const demoUser = activeUserId || "b6d68ba0-3976-4f8b-803a-e4c61f3bfa67";
    setActiveAmount(demoAmount);
    setActiveUserId(demoUser);
    initRazorpay(demoAmount, demoUser);
  };

  return (
    <div className="min-h-screen bg-[#f8f8f8] text-black flex items-center justify-center font-sans p-4">
      <div className="nb-box p-8 max-w-md w-full text-center relative overflow-hidden bg-white border-4 border-black shadow-[8px_8px_0_0_#000]">
        <div className="absolute top-0 left-0 w-full h-2 bg-[#ffcc00] border-b-4 border-black" />

        <div className="inline-block bg-[#ffcc00] border-2 border-black px-3 py-1 font-black text-xs uppercase tracking-widest shadow-[2px_2px_0_0_#000] mb-4">
          CodeStake Checkout
        </div>

        <h1 className="text-2xl font-black uppercase tracking-tight mb-2">
          Pay Debt
        </h1>

        <div className="bg-white border-4 border-black p-4 mb-6 flex justify-between items-center text-sm shadow-[4px_4px_0_0_#000]">
          <span className="text-black uppercase tracking-widest text-xs font-black">Amount Due</span>
          <span className="text-black font-mono font-black text-2xl">
            ${((activeAmount || 0) / 100).toFixed(2)} <span className="text-xs text-gray-500 font-sans">USD</span>
          </span>
        </div>

        {error ? (
          <div className="space-y-4">
            <div className="text-xs font-black uppercase text-white bg-[#ff3333] p-3 border-4 border-black shadow-[4px_4px_0_0_#000]">
              {error}
            </div>

            {activeAmount > 0 ? (
              <button
                onClick={() => initRazorpay()}
                disabled={isProcessing}
                className="nb-btn nb-btn-primary w-full py-3.5 text-sm uppercase tracking-wider"
              >
                Re-Open UPI / Razorpay Checkout
              </button>
            ) : (
              <div className="space-y-3 pt-2">
                <p className="text-xs text-gray-600 font-bold uppercase tracking-wider">
                  Interview / Demo Mode:
                </p>
                <button
                  onClick={handleTestDemoPay}
                  disabled={isProcessing}
                  className="nb-btn nb-btn-primary w-full py-3.5 text-sm uppercase tracking-wider bg-[#00ff66] text-black hover:bg-[#00dd55]"
                >
                  🚀 Test Pay $5.00 via UPI QR
                </button>
              </div>
            )}

            <button
              onClick={() => window.close()}
              className="text-xs text-black font-bold uppercase underline tracking-wider block mx-auto mt-2"
            >
              Close Window
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="w-12 h-12 border-4 border-black border-t-[#00ff66] animate-spin shadow-[3px_3px_0_0_#000]"></div>
            <p className="text-xs font-black uppercase tracking-widest text-black bg-[#ffcc00] px-4 py-2 border-2 border-black shadow-[2px_2px_0_0_#000]">
              {status}
            </p>
            <p className="text-[11px] text-gray-600 font-bold uppercase tracking-wide">
              Scan the UPI QR code on your phone using PhonePe, GPay, or Paytm.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function WalletEmbedPage() {
  return (
    <Suspense fallback={<div className="bg-white min-h-screen"></div>}>
      <EmbedContent />
    </Suspense>
  );
}
