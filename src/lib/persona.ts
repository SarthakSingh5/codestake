export type PersonaTier = 1 | 2 | 3 | 4 | 5;

export const getPersonaTier = (score: number): PersonaTier => {
  if (score < -20) return 1; // The Broken
  if (score >= -20 && score <= -1) return 2; // The Slipping
  if (score === 0) return 3; // The Bound (Neutral)
  if (score >= 1 && score <= 20) return 4; // The Ascending
  return 5; // The God-Complex
};

export const getTierMetadata = (score: number) => {
  const tier = getPersonaTier(score);
  
  switch(tier) {
    case 1:
      return {
        name: "THE BROKEN",
        color: "text-red-600",
        bgGlow: "from-red-950 to-black",
        border: "border-red-900/50",
        shadow: "shadow-red-900/20",
        quote: "You are exactly who you feared you were."
      };
    case 2:
      return {
        name: "THE SLIPPING",
        color: "text-orange-500",
        bgGlow: "from-orange-950/50 to-black",
        border: "border-orange-900/50",
        shadow: "shadow-orange-900/10",
        quote: "You trade your potential for comfort."
      };
    case 3:
      return {
        name: "THE BOUND",
        color: "text-slate-300",
        bgGlow: "from-slate-900 to-black",
        border: "border-slate-800",
        shadow: "shadow-slate-800/20",
        quote: "The pact is active. Do not waver."
      };
    case 4:
      return {
        name: "THE ASCENDING",
        color: "text-teal-400",
        bgGlow: "from-teal-950/50 to-black",
        border: "border-teal-900/50",
        shadow: "shadow-teal-900/20",
        quote: "Your discipline is becoming a weapon."
      };
    case 5:
      return {
        name: "THE GOD-COMPLEX",
        color: "text-emerald-400",
        bgGlow: "from-emerald-950 to-black",
        border: "border-emerald-500/30",
        shadow: "shadow-emerald-900/40",
        quote: "Your logic is effortless. You are untouchable."
      };
  }
};
