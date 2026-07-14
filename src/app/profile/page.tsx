import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import { getTierMetadata } from "@/lib/persona";
import Navbar from "../components/Navbar";

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
    <div className={`min-h-screen bg-gradient-to-b ${metadata.bgGlow} flex flex-col relative overflow-hidden font-sans`}>
      <Navbar />
      
      {/* Background ambient light */}
      <div className={`absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] ${metadata.bgGlow} opacity-30 pointer-events-none z-0`} />

      {/* The Mirror / Orb */}
      <div className="relative z-10 flex flex-col items-center justify-center w-full max-w-4xl mx-auto px-4 flex-1">
        
        {/* Visual Orb */}
        <div className="mb-16 relative">
          <div className={`w-48 h-48 sm:w-64 sm:h-64 md:w-80 md:h-80 ${orbClass} ${pulseClass} backdrop-blur-3xl mix-blend-screen transition-all duration-1000`} />
          <div className={`absolute inset-0 blur-3xl ${orbClass} opacity-50`} />
        </div>

        {/* Persona Score */}
        <div className="text-center mb-4 transition-all duration-1000 transform translate-y-0 opacity-100 mt-8">
          <span className={`text-6xl sm:text-8xl font-light tracking-tighter ${metadata.color} drop-shadow-2xl`}>
            {score > 0 ? "+" : ""}{score}
          </span>
        </div>

        {/* Tier Name */}
        <div className="text-center mb-16 transition-all duration-1000 transform translate-y-0 opacity-100">
          <h1 className={`text-3xl sm:text-5xl font-black uppercase tracking-[0.3em] ${metadata.color} drop-shadow-lg`}>
            {metadata.name}
          </h1>
        </div>

        {/* The Quote */}
        <div className="text-center max-w-2xl px-6 transition-all duration-1000 transform translate-y-0 opacity-100 mb-12">
          <p className="text-lg sm:text-xl md:text-2xl text-slate-300 font-serif italic tracking-wide leading-relaxed">
            "{metadata.quote}"
          </p>
        </div>

      </div>
    </div>
  );
}
