"use client";

import { useEffect, useState, Suspense } from "react";
import Script from "next/script";
import { useSearchParams } from "next/navigation";

function EmbedContent() {
  const searchParams = useSearchParams();
  const userId = searchParams.get('userId');
  const amountCents = parseInt(searchParams.get('amount') || '0', 10);
  const [status, setStatus] = useState("Initializing Razorpay...");
  const [error, setError] = useState<string | null>(null);
  const [hasOpened, setHasOpened] = useState(false);

  useEffect(() => {
    if (!userId || amountCents <= 0) {
      setError("Invalid payment parameters.");
      return;
    }

    if (hasOpened) return;
    setHasOpened(true);

    const initRazorpay = async () => {
      try {
        const res = await fetch("/api/extension/checkout/razorpay", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amountCents, userId }),
        });
        const data = await res.json();

        if (data.orderId) {
          const options = {
            key: data.keyId,
            amount: data.amount,
            currency: data.currency,
            name: "CodeStake",
            description: `Deposit $${(amountCents / 100).toFixed(2)}`,
            order_id: data.orderId,
            handler: function (response: any) {
              setStatus("Payment Successful! Verifying...");
              // Notify the parent extension that payment was successful
              window.parent.postMessage({ type: 'CODESTAKE_PAYMENT_SUCCESS' }, '*');
            },
            prefill: {
              name: "CodeStake User",
            },
            theme: {
              color: "#10b981", // Emerald 500
            },
            config: {
              display: {
                blocks: {
                  upi: {
                    name: "Pay via UPI QR",
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
                setError("Payment window closed. Please try again.");
                window.parent.postMessage({ type: 'CODESTAKE_PAYMENT_DISMISSED' }, '*');
              }
            }
          };

          const rzp = new (window as any).Razorpay(options);
          rzp.open();
        } else {
          setError("Failed to initialize Razorpay: " + (data.error || "Unknown error"));
        }
      } catch (err) {
        console.error(err);
        setError("Network error occurred.");
      }
    };

    // Wait for the script to load before calling init
    const checkScript = setInterval(() => {
      if ((window as any).Razorpay) {
        clearInterval(checkScript);
        initRazorpay();
      }
    }, 500);

    return () => clearInterval(checkScript);
  }, [userId, amountCents, hasOpened]);

  return (
    <div className="min-h-screen bg-[#0b0f1e] text-white flex items-center justify-center font-sans p-4 text-center">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="beforeInteractive" />
      {error ? (
        <div className="text-red-400 font-mono text-sm">{error}</div>
      ) : (
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-400 text-sm animate-pulse">{status}</p>
        </div>
      )}
    </div>
  );
}

export default function WalletEmbedPage() {
  return (
    <Suspense fallback={<div className="bg-[#0b0f1e] min-h-screen"></div>}>
      <EmbedContent />
    </Suspense>
  );
}
