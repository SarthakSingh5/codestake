import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Admin — CodeStake",
  description: "CodeStake admin dashboard",
};

export default async function AdminPage() {
  const supabase = await createSupabaseServerClient();

  // Double-check auth + role server-side (proxy is the first line of defense)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") redirect("/");

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#02050b] via-[#050c1d] to-[#071426] text-slate-100">
      {/* Ambient glow */}
      <div
        className="pointer-events-none fixed -top-32 left-1/2 -translate-x-1/2 h-96 w-96 rounded-full blur-3xl opacity-20"
        style={{
          background: "radial-gradient(circle, #6366f1 0%, transparent 70%)",
        }}
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-5xl px-6 py-12">
        {/* Header */}
        <div className="mb-10 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white">
              Admin Panel
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Manage CodeStake platform
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-indigo-500/20 px-3 py-1 text-xs font-medium text-indigo-300 ring-1 ring-indigo-400/30">
              Admin
            </span>
            <form
              action={async () => {
                "use server";
                const { createSupabaseServerClient } = await import(
                  "@/lib/supabase/server-client"
                );
                const { redirect } = await import("next/navigation");
                const supabase = await createSupabaseServerClient();
                await supabase.auth.signOut();
                redirect("/");
              }}
            >
              <button
                type="submit"
                className="flex items-center gap-2 rounded-lg bg-white/5 px-4 py-2 text-sm font-medium text-slate-300 ring-1 ring-white/10 transition hover:bg-red-500/20 hover:text-red-300 hover:ring-red-400/30"
              >
                Sign Out
              </button>
            </form>
          </div>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-10">
          {[
            { label: "Total Users", value: "—", icon: "👥" },
            { label: "Active Contests", value: "—", icon: "🏆" },
            { label: "Revenue", value: "—", icon: "💰" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-white/10 bg-[#0b0f1e]/80 p-5 backdrop-blur"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">{stat.label}</span>
                <span className="text-xl">{stat.icon}</span>
              </div>
              <p className="mt-2 text-2xl font-bold text-white">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Action cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {[
            {
              title: "Manage Users",
              description: "View, edit, and moderate user accounts",
              href: "/admin/users",
            },
            {
              title: "Manage Contests",
              description: "Create and manage coding contests",
              href: "/admin/contests",
            },
            {
              title: "Problems",
              description: "Add and edit coding problems",
              href: "/admin/problems",
            },
            {
              title: "Settings",
              description: "Platform configuration and settings",
              href: "/admin/settings",
            },
          ].map((card) => (
            <div
              key={card.title}
              className="group rounded-2xl border border-white/10 bg-[#0b0f1e]/80 p-6 backdrop-blur transition hover:border-indigo-400/30 hover:bg-[#0b0f1e]"
            >
              <h2 className="text-lg font-semibold text-white group-hover:text-indigo-300 transition">
                {card.title}
              </h2>
              <p className="mt-1 text-sm text-slate-400">{card.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
