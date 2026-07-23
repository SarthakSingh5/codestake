import { redirect } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import Navbar from "./components/Navbar";

export const metadata = {
  title: "CodeStake",
  description: "Compete. Solve. Win.",
};

export default async function Home() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  // If logged in, redirect directly to the Arena (problems)
  if (user) {
    redirect("/problems");
  }

  // If logged out, show the Landing Page
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#02050b] via-[#050c1d] to-[#071426] flex items-center justify-center px-4 text-slate-100 overflow-hidden relative">
      {/* Background Effects */}
      <div
        className="absolute top-0 -left-1/4 w-[150%] h-[150%] pointer-events-none opacity-20"
        style={{
          background: "radial-gradient(circle at 50% 30%, #6366f1 0%, transparent 60%)",
        }}
        aria-hidden="true"
      />

      {/* Grid pattern (optional if image missing, but adds subtle texture if we had one) */}
      <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.03] pointer-events-none" />

      <div className="relative w-full max-w-5xl mx-auto flex flex-col md:flex-row items-center gap-12 lg:gap-20 z-10 py-12 md:py-24">

        {/* Left column: Copy & CTA */}
        <div className="flex-1 text-center md:text-left flex flex-col items-center md:items-start">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-sm font-medium mb-6">
            <span className="flex h-2 w-2 rounded-full bg-indigo-500 animate-pulse"></span>
            The ultimate coding arena
          </div>

          <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight text-white mb-6 leading-tight">
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400">Bet on</span>
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-indigo-400">Yourself.</span>
          </h1>

          <p className="text-lg md:text-xl text-slate-400 max-w-lg mb-8 leading-relaxed">
            Compete in high-stakes coding challenges. Solve complex algorithms, prove your skills, and win rewards. It's time to stake your claim.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            <Link
              id="btn-home-signup"
              href="/signup"
              className="inline-flex items-center justify-center rounded-full bg-indigo-600 px-8 py-4 text-sm font-bold text-white shadow-lg shadow-indigo-900/40 transition-all hover:bg-indigo-500 hover:shadow-indigo-900/60 active:scale-[0.98]"
            >
              Start Competing Now
            </Link>
            <Link
              id="btn-home-login"
              href="/login"
              className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-8 py-4 text-sm font-bold text-slate-200 backdrop-blur transition-all hover:bg-white/10 hover:text-white active:scale-[0.98]"
            >
              Sign In
            </Link>
          </div>

          <div className="mt-12 flex items-center gap-4 text-sm text-slate-500">
            <div className="flex -space-x-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="w-8 h-8 rounded-full border-2 border-[#050c1d] bg-slate-800 flex items-center justify-center text-xs z-[4-i]">
                  {['👩‍💻', '👨‍💻', '🚀', '🔥'][i]}
                </div>
              ))}
            </div>
            <p>Join <span className="text-slate-300 font-semibold">1,000+</span> developers already competing.</p>
          </div>
        </div>

        {/* Right column: Visual / Quote */}
        <div className="flex-1 w-full max-w-md hidden md:block relative group">
          <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-[2.5rem] blur-2xl opacity-20 group-hover:opacity-30 transition duration-700"></div>

          <div className="relative rounded-[2rem] border border-white/10 bg-[#0b0f1e]/80 p-8 shadow-2xl backdrop-blur overflow-hidden">
            {/* Decorative code block */}
            <div className="flex items-center gap-2 mb-6 border-b border-white/10 pb-4">
              <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
              <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
            </div>

            <pre className="font-mono text-sm text-slate-300 overflow-x-auto">
              <code>
                <span className="text-pink-400">function</span> <span className="text-blue-400">succeed</span>() {'{\n'}
                {'  '}<span className="text-purple-400">const</span> mindset = <span className="text-green-400">"unbreakable"</span>;{'\n'}
                {'  '}<span className="text-pink-400">while</span> (mindset === <span className="text-green-400">"unbreakable"</span>) {'{\n'}
                {'    '}<span className="text-yellow-200">practice</span>();{'\n'}
                {'    '}<span className="text-pink-400">if</span> (<span className="text-yellow-200">fail</span>()) <span className="text-blue-400">learn</span>();{'\n'}
                {'    '}<span className="text-pink-400">else</span> <span className="text-blue-400">win</span>();{'\n'}
                {'  }'}{'\n'}
                {'}'}
              </code>
            </pre>

            <div className="mt-8 border-t border-white/10 pt-6">
              <blockquote className="text-slate-300 italic font-medium leading-relaxed">
                "The only way to win is to raise the stakes."
              </blockquote>
              <p className="mt-2 text-sm text-slate-500 font-semibold">— CodeStake Philosophy</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
