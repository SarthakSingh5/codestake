import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import Navbar from "@/app/components/Navbar";
import ExtensionSync from "@/app/components/ExtensionSync";

export default async function ExtensionPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-white font-sans">
      <Navbar />
      {user && <ExtensionSync userId={user.id} />}
      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8 text-center mt-10">
        <div className="inline-block bg-[#00ff66] border-4 border-black px-4 py-2 shadow-[4px_4px_0_0_#000] rotate-1 mb-10">
          <h1 className="text-4xl font-black tracking-tighter text-black sm:text-5xl lg:text-6xl uppercase">
            Take CodeStake to <span className="text-white bg-black px-2 mx-1 border-2 border-black">LeetCode</span>
          </h1>
        </div>
        <p className="mx-auto mt-4 max-w-2xl text-xl text-black font-bold uppercase tracking-widest bg-white border-4 border-black p-4 shadow-[4px_4px_0_0_#000] -rotate-1 mb-10">
          Install the official Chrome Extension to put real money on the line while practicing algorithms directly on LeetCode.com.
        </p>

        {user ? (
          <div className="nb-box p-8 max-w-lg mx-auto mb-8 bg-white border-8 border-black shadow-[12px_12px_0_0_#000]">
            <div className="w-16 h-16 bg-[#00ff66] border-4 border-black flex items-center justify-center mx-auto mb-6 shadow-[4px_4px_0_0_#000]">
              <svg className="w-8 h-8 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"></path></svg>
            </div>
            <h2 className="text-3xl font-black text-black mb-4 uppercase tracking-tighter bg-[#ffcc00] inline-block px-2 border-2 border-black">You are Connected!</h2>
            <p className="text-black font-bold mb-8 uppercase tracking-widest text-sm border-l-4 border-[#ff3333] pl-4 text-left">
              We have securely synced your CodeStake account with your Chrome Extension.
            </p>
            <a
              href="https://leetcode.com/problems/two-sum"
              target="_blank"
              rel="noreferrer"
              className="nb-btn nb-btn-primary w-full py-4 text-xl inline-block"
            >
              Go to LeetCode
            </a>
          </div>
        ) : (
          <div className="nb-box p-8 max-w-lg mx-auto mb-8 bg-white border-8 border-black shadow-[12px_12px_0_0_#000]">
            <div className="absolute -top-6 -right-6 w-12 h-12 bg-[#ff3333] border-4 border-black flex items-center justify-center text-white font-black text-2xl shadow-[4px_4px_0_0_#000]">!</div>
            <h2 className="text-3xl font-black text-black mb-4 uppercase tracking-tighter bg-black text-white inline-block px-2 border-2 border-black">Login Required</h2>
            <p className="text-black font-bold mb-8 uppercase tracking-widest text-sm border-l-4 border-black pl-4 text-left">
              You need to be logged into CodeStake to connect the extension.
            </p>
            <Link
              href="/login"
              className="nb-btn nb-btn-primary w-full py-4 text-xl inline-block"
            >
              Sign In / Sign Up
            </Link>
          </div>
        )}

        <div className="mt-16 text-black font-black uppercase border-2 border-black bg-[#ffcc00] inline-block px-4 py-2 shadow-[2px_2px_0_0_#000]">
          <p>Currently only available for Google Chrome and Brave.</p>
        </div>
      </div>
    </div>
  );
}
