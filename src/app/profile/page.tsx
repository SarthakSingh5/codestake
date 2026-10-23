import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import { createSupabaseAdminClient } from "@/lib/supabase/admin-client";
import { getTierMetadata } from "@/lib/persona";
import Navbar from "../components/Navbar";
import ActiveSessionsList from "./components/ActiveSessionsList";

export default async function ProfilePage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: wallet } = await supabase
    .from("wallets")
    .select("persona_score")
    .eq("user_id", user.id)
    .single();

  const score = wallet?.persona_score || 0;
  const metadata = getTierMetadata(score);

  // Fetch Active Sessions using adminClient to bypass RLS on problems table
  const adminClient = createSupabaseAdminClient();
  const { data: activeSessions } = await adminClient
    .from("stake_sessions")
    .select(`
      *,
      problems (
        title,
        slug,
        platform
      )
    `)
    .eq("user_id", user.id)
    .eq("status", "active")
    .order("created_at", { ascending: false });

  // We map the tier to different visual treatments for the 'Orb'
  // Tier 1 & 2: Glitchy, shattered, fast pulse
  // Tier 3: Solid, calm pulse
  // Tier 4 & 5: Smooth, powerful glow, slow pulse
  let orbClass = "rounded-full ";
  let pulseClass = "";

  if (score < 0) {
    // The Broken / The Slipping
    orbClass += "bg-red-500/20 shadow-[0_0_100px_rgba(220,38,38,0.6)] ";
    // Add jagged/shattered effect via clip-path if we wanted, but we'll stick to intense blur & pulsing for now.
    pulseClass = "animate-pulse duration-75";
  } else if (score === 0) {
    // The Bound
    orbClass += "bg-slate-500/10 shadow-[0_0_60px_rgba(148,163,184,0.3)] ";
    pulseClass = "animate-pulse duration-1000";
  } else {
    // The Ascending / God-Complex
    orbClass += "bg-emerald-400/20 shadow-[0_0_150px_rgba(52,211,153,0.8)] border border-emerald-300/30 ";
    pulseClass = "animate-pulse duration-[3000ms]"; // Slow, confident breath
  }

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans">
      <Navbar />

      <div className="relative flex flex-col items-center justify-center w-full max-w-5xl mx-auto px-4 flex-1 py-16">

        {/* Persona Score Box */}
        <div className={`nb-box p-12 text-center mb-12 border-8 border-black shadow-[12px_12px_0_0_#000] relative rotate-1 
          ${score < 0 ? 'bg-[#ff3333]' : score === 0 ? 'bg-[#f0f0f0]' : 'bg-[#00ff66]'}`}>

          <div className="absolute -top-6 -left-6 bg-black text-white font-black uppercase text-xl px-4 py-2 border-4 border-black shadow-[4px_4px_0_0_#fff]">
            Persona Score
          </div>

          <div className="text-8xl md:text-[12rem] font-black tracking-tighter text-black drop-shadow-[4px_4px_0_rgba(255,255,255,1)]">
            {score > 0 ? "+" : ""}{score}
          </div>
        </div>

        {/* Tier Name */}
        <div className="text-center mb-12 border-y-8 border-black w-full py-6 bg-[#ffcc00] -rotate-1">
          <h1 className="text-5xl sm:text-7xl font-black uppercase tracking-tighter text-black">
            {metadata.name}
          </h1>
        </div>

        {/* The Quote */}
        <div className="text-center max-w-3xl px-8 py-6 mb-16 bg-white border-4 border-black shadow-[6px_6px_0_0_#000] relative">
          <div className="absolute top-0 left-4 -translate-y-1/2 bg-black text-white px-2 font-black text-4xl">"</div>
          <p className="text-2xl sm:text-3xl text-black font-bold uppercase tracking-widest leading-relaxed">
            {metadata.quote}
          </p>
        </div>

      </div>

      {/* Active Sessions Tracker */}
      <div className="w-full relative z-10 bg-white border-t-8 border-black pt-12 pb-24 shadow-[0_-8px_0_0_rgba(0,0,0,0.1)]">
        <ActiveSessionsList sessions={activeSessions || []} />
      </div>

    </div>
  );
}
