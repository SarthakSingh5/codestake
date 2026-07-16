export default function BannedPage() {
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center font-sans relative overflow-hidden">
      {/* Intense dark red vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-transparent via-black to-black opacity-80 z-0 pointer-events-none" />
      <div className="absolute inset-0 bg-red-950/10 z-0 pointer-events-none" />

      <div className="relative z-10 text-center max-w-2xl px-6">
        {/* Tombstone Symbol */}
        <div className="mb-12 flex justify-center">
          <div className="w-24 h-32 border-2 border-red-900 bg-red-950/20 shadow-[0_0_100px_rgba(153,27,27,0.3)] relative overflow-hidden">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1px] h-full bg-red-900/50" />
            <div className="absolute top-1/2 left-0 -translate-y-1/2 w-full h-[1px] bg-red-900/50" />
          </div>
        </div>

        <h1 className="text-4xl sm:text-6xl font-black text-red-700 uppercase tracking-[0.3em] mb-6 drop-shadow-[0_0_15px_rgba(220,38,38,0.5)]">
          EXILED
        </h1>

        <p className="text-xl sm:text-2xl text-slate-400 font-serif italic tracking-wider leading-relaxed mb-12">
          "You chose the coward's way out. <br />
          Your pact is broken. Your honor is forfeit. <br />
          You are permanently banished."
        </p>

        <p className="text-xs text-slate-600 font-mono tracking-[0.2em] uppercase">
          There is no return.
        </p>
      </div>
    </div>
  );
}
