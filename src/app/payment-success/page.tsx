export const metadata = {
  title: "Payment Successful — CodeStake",
  description: "Your debt has been cleared.",
};

export default function PaymentSuccessPage() {
  return (
    <div className="min-h-screen bg-[#f8f8f8] text-black flex flex-col items-center justify-center p-4 font-sans">
      <div className="nb-box p-8 max-w-md w-full text-center relative overflow-hidden animate-in zoom-in-95 duration-200 border-4 border-black shadow-[8px_8px_0_0_#000]">
        <div className="absolute top-0 left-0 w-full h-2 bg-[#00ff66] border-b-4 border-black" />

        <div className="w-16 h-16 bg-[#00ff66] border-4 border-black flex items-center justify-center mx-auto mb-6 shadow-[4px_4px_0_0_#000]">
          <svg className="w-8 h-8 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <div className="py-2 px-2 text-center mb-4">
          <h1 className="text-black font-black uppercase text-3xl leading-snug tracking-tighter bg-[#00ff66] p-2 border-4 border-black shadow-[4px_4px_0_0_#000]">
            DEBT CLEARED
          </h1>
        </div>

        <div className="bg-white border-4 border-black p-5 mb-6 text-left shadow-[4px_4px_0_0_#000]">
          <p className="text-black font-black text-base uppercase mb-2">
            Payment Complete
          </p>
          <p className="text-black font-bold text-sm leading-relaxed">
            Your tab is settled and your pact is restored. You can now close this tab and continue solving on LeetCode.
          </p>
        </div>

        <div className="bg-[#ffcc00] border-4 border-black p-3 text-center shadow-[4px_4px_0_0_#000]">
          <p className="text-xs text-black font-black uppercase tracking-widest">
            Close this tab to continue. The extension has unlocked automatically.
          </p>
        </div>
      </div>
    </div>
  );
}
