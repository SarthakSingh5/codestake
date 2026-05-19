import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import { redirect } from "next/navigation";
import Navbar from "../components/Navbar";

export const metadata = {
  title: "Problems — CodeStake",
  description: "Browse and solve coding problems.",
};

export default async function ProblemsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Protect the route
  if (!user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-[#02050b] text-slate-100 flex flex-col">
      <Navbar />
      <main className="flex-1 relative">
        {/* Ambient glow */}
        <div
          className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 h-96 w-96 rounded-full blur-3xl opacity-20"
          style={{ background: "radial-gradient(circle, #6366f1 0%, transparent 70%)" }}
          aria-hidden="true"
        />

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 relative">
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight text-white">Problems</h1>
            <p className="mt-2 text-sm text-slate-400">Select a problem to start coding.</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#0b0f1e]/80 p-12 backdrop-blur flex flex-col items-center justify-center text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/5 ring-1 ring-white/10">
              <span className="text-2xl">📝</span>
            </div>
            <h3 className="text-lg font-medium text-white">No problems available yet</h3>
            <p className="mt-2 text-sm text-slate-400 max-w-sm">
              We are currently preparing the problem set. Check back later to start your coding journey.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
