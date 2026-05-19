import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import { redirect } from "next/navigation";

export default function Navbar() {
  return (
    <nav className="border-b border-white/10 bg-[#02050b]/80 backdrop-blur sticky top-0 z-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/20 ring-1 ring-indigo-400/30 shadow-lg shadow-indigo-900/30 transition group-hover:ring-indigo-400/60">
                <svg className="h-5 w-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-4-4h-1M9 20H4v-2a4 4 0 014-4h1m4-4a4 4 0 100-8 4 4 0 000 8z" />
                </svg>
              </div>
              <span className="text-lg font-bold tracking-tight text-white">CodeStake</span>
            </Link>
            
            <div className="hidden md:block">
              <div className="flex items-baseline space-x-4">
                <Link
                  href="/problems"
                  className="rounded-md px-3 py-2 text-sm font-medium text-slate-300 hover:bg-white/5 hover:text-white transition"
                >
                  Problems
                </Link>
              </div>
            </div>
          </div>
          
          <div>
            <form
              action={async () => {
                "use server";
                const supabase = await createSupabaseServerClient();
                await supabase.auth.signOut();
                redirect("/");
              }}
            >
              <button
                type="submit"
                className="rounded-lg bg-white/5 px-4 py-2 text-sm font-medium text-slate-300 ring-1 ring-white/10 transition hover:bg-white/10 hover:text-white"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </div>
    </nav>
  );
}
