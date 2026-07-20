import Link from "next/link";

export const metadata = {
  title: "Payment Successful — CodeStake",
  description: "Your debt has been cleared.",
};

export default function PaymentSuccessPage() {
  return (
    <div className="min-h-screen bg-[#02050b] text-slate-100 flex flex-col items-center justify-center p-4">
      {/* Ambient glow */}
      <div
        className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-96 w-full max-w-3xl rounded-full blur-[120px] opacity-20"
        style={{ background: "radial-gradient(circle, #10b981 0%, transparent 70%)" }}
        aria-hidden="true"
      />

      <div className="bg-[#0b0f1e]/80 border border-emerald-500/30 p-8 rounded-2xl max-w-md w-full text-center relative z-10 shadow-[0_0_30px_rgba(16,185,129,0.15)] backdrop-blur">
        <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        
        <h1 className="text-2xl font-bold text-white mb-2 tracking-wide uppercase">Debt Cleared</h1>
        <p className="text-slate-400 mb-8 text-sm">
          Your payment was successful. The pact has been restored. You may now close this tab and return to the arena.
        </p>

        <p className="text-xs text-emerald-500/70 uppercase tracking-widest font-bold">
          (The CodeStake extension will unlock automatically)
        </p>
      </div>
    </div>
  );
}
