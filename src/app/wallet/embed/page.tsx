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
              window.parent.postMessage({ type: 'CODESTAKE_PAYMENT_SUCCESS' }, '*');
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

    const checkScript = setInterval(() => {
      if ((window as any).Razorpay) {
        clearInterval(checkScript);
        initRazorpay();
      }
    }, 500);

    return () => clearInterval(checkScript);
  }, [userId, amountCents, hasOpened]);

  return (
    <div className="min-h-screen bg-white text-black flex items-center justify-center font-sans p-4 text-center">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="beforeInteractive" />
      {error ? (
        <div className="text-xs font-black uppercase text-white bg-[#ff3333] p-3 border-4 border-black shadow-[4px_4px_0_0_#000]">
          {error}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-black border-t-[#00ff66] animate-spin shadow-[2px_2px_0_0_#000]"></div>
          <p className="text-xs font-black uppercase tracking-widest text-black bg-[#ffcc00] px-3 py-1.5 border-2 border-black shadow-[2px_2px_0_0_#000]">
            {status}
          </p>
        </div>
      )}
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
