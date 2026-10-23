import { redirect } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";

export const metadata = {
  title: "CodeStake",
  description: "Compete. Solve. Win.",
};

export default async function Home() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    redirect("/problems");
  }
  // If logged out, show the Landing Page
  return (
    <div className="min-h-screen flex flex-col items-center px-4 relative font-sans overflow-hidden">
      {/* Navbar will be rendered via layout or top level, assuming it's separate. If not, this is just the hero. */}

      <div className="relative w-full max-w-6xl mx-auto flex flex-col md:flex-row items-center gap-12 lg:gap-16 z-10 py-20 md:py-32">

        {/* Left column: Copy & CTA */}
        <div className="flex-1 text-center md:text-left flex flex-col items-center md:items-start z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 border-4 border-black bg-[#ffcc00] text-black text-sm font-black uppercase tracking-widest mb-6 shadow-[4px_4px_0_0_#000]">
            <span className="flex h-3 w-3 border-2 border-black bg-[#ff3333] animate-pulse"></span>
            The Ultimate Coding Arena
          </div>

          <h1 className="text-6xl md:text-7xl lg:text-8xl font-black tracking-tighter text-black mb-8 leading-[0.9] uppercase">
            <span className="block">Bet on</span>
            <span className="block bg-[#00ff66] inline-block px-2 border-4 border-black shadow-[6px_6px_0_0_#000] mt-2 rotate-1">Yourself.</span>
          </h1>

          <p className="text-xl md:text-2xl text-black font-medium max-w-xl mb-10 leading-relaxed border-l-8 border-[#ff3333] pl-6 bg-white p-4 shadow-[4px_4px_0_0_#000] border-y-4 border-r-4 border-y-black border-r-black">
            Compete in high-stakes coding challenges. Solve complex algorithms, prove your skills, and win rewards. It's time to stake your claim.
          </p>

          <div className="flex flex-col sm:flex-row gap-6 w-full sm:w-auto">
            <Link
              id="btn-home-signup"
              href="/signup"
              className="nb-btn nb-btn-primary px-10 py-5 text-lg"
            >
              Start Competing Now
            </Link>
            <Link
              id="btn-home-login"
              href="/login"
              className="nb-btn bg-white px-10 py-5 text-lg hover:bg-gray-100"
            >
              Sign In
            </Link>
          </div>

          <div className="mt-16 flex items-center gap-4 text-sm text-black font-bold uppercase tracking-widest bg-white border-4 border-black px-6 py-3 shadow-[4px_4px_0_0_#000]">
            <div className="flex -space-x-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="w-10 h-10 border-2 border-black bg-[#00ff66] flex items-center justify-center text-lg z-[4-i] shadow-sm">
                  {['👩‍💻', '👨‍💻', '🚀', '🔥'][i]}
                </div>
              ))}
            </div>
            <p>Join <span className="text-[#ff3333] text-lg">1,000+</span> developers.</p>
          </div>
        </div>

        {/* Right column: Visual / Quote */}
        <div className="flex-1 w-full max-w-lg hidden md:block relative group">
          <div className="nb-box p-8 bg-[#00ff66] rotate-2 hover:rotate-0 transition-transform duration-300">
            {/* Decorative block */}
            <div className="flex items-center gap-3 mb-6 border-b-4 border-black pb-4">
              <div className="w-4 h-4 border-2 border-black bg-[#ff3333]"></div>
              <div className="w-4 h-4 border-2 border-black bg-[#ffcc00]"></div>
              <div className="w-4 h-4 border-2 border-black bg-white"></div>
              <div className="ml-auto font-black uppercase text-xs tracking-widest">mindset.exe</div>
            </div>

            <pre className="font-mono text-sm md:text-base text-black font-bold overflow-x-auto bg-white p-4 border-4 border-black shadow-[inset_4px_4px_0_0_#000]">
              <code>
                <span className="text-black">function</span> <span className="bg-[#00ff66] px-1">succeed</span>() {'{\n'}
                {'  '}const mindset = <span className="bg-[#ffcc00] px-1">"unbreakable"</span>;{'\n'}
                {'  '}while (mindset === <span className="bg-[#ffcc00] px-1">"unbreakable"</span>) {'{\n'}
                {'    '}practice();{'\n'}
                {'    '}if (<span className="bg-[#ff3333] text-white px-1">fail()</span>) learn();{'\n'}
                {'    '}else <span className="bg-[#00ff66] px-1">win()</span>;{'\n'}
                {'  }'}{'\n'}
                {'}'}
              </code>
            </pre>

            <div className="mt-8 border-t-4 border-black pt-6 bg-[#ffcc00] -mx-8 px-8 -mb-8 pb-8 border-b-0 border-l-0 border-r-0">
              <blockquote className="text-black font-black uppercase text-xl leading-snug">
                "The only way to win is to raise the stakes."
              </blockquote>
              <p className="mt-2 text-sm font-bold">— CodeStake Philosophy</p>
            </div>
          </div>
          {/* Background decorative box */}
          <div className="absolute inset-0 bg-[#00ff66] border-4 border-black -z-10 translate-x-4 translate-y-4 shadow-[4px_4px_0_0_#000]"></div>
        </div>

      </div>
    </div>
  );
}
