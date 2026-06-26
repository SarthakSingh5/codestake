import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import Navbar from "@/app/components/Navbar";
import ExtensionSync from "@/app/components/ExtensionSync";

export default async function ExtensionPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-[#02050b] font-sans">
      <Navbar />
      {user && <ExtensionSync userId={user.id} />}
      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8 text-center mt-10">
        <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl mb-6">
          Take CodeStake to <span className="text-red-500">LeetCode</span>
        </h1>
      <p className="mx-auto mt-4 max-w-2xl text-xl text-slate-400 mb-10">
        Install the official Chrome Extension to put real money on the line while practicing algorithms directly on LeetCode.com.
      </p>

      {user ? (
        <div className="bg-emerald-900/20 border border-emerald-500/30 rounded-xl p-8 max-w-lg mx-auto mb-8 animate-in fade-in zoom-in duration-500">
          <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">You are Connected!</h2>
          <p className="text-emerald-200/80 mb-6">
            We have securely synced your CodeStake account with your Chrome Extension.
          </p>
          <a
            href="https://leetcode.com/problems/two-sum"
            target="_blank"
            rel="noreferrer"
            className="inline-block w-full rounded-lg bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-emerald-500 transition-all"
          >
            Go to LeetCode
          </a>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 max-w-lg mx-auto mb-8">
          <h2 className="text-2xl font-bold text-white mb-2">Login Required</h2>
          <p className="text-slate-400 mb-6">
            You need to be logged into CodeStake to connect the extension.
          </p>
          <Link
            href="/login"
            className="inline-block w-full rounded-lg bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 transition-all"
          >
            Sign In / Sign Up
          </Link>
        </div>
      )}

      <div className="mt-16 text-slate-500 text-sm">
        <p>Currently only available for Google Chrome and Brave.</p>
      </div>
      </div>
    </div>
  );
}
