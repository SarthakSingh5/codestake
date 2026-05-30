"use client";

import { useTransition, useState } from "react";
import { toggleHardcoreMode } from "@/app/actions/hardcore";
import { useRouter } from "next/navigation";

export default function HardcoreToggle({ initialEnabled }: { initialEnabled: boolean }) {
  const [isPending, startTransition] = useTransition();
  const [optimisticEnabled, setOptimisticEnabled] = useState(initialEnabled);
  const router = useRouter();

  const handleToggle = () => {
    const newValue = !optimisticEnabled;
    setOptimisticEnabled(newValue); // Instantly update UI

    startTransition(async () => {
      try {
        await toggleHardcoreMode(newValue);
        router.refresh(); // Tell Next.js to refresh the server components
      } catch (err) {
        // If the server fails, revert the UI back to what it was
        setOptimisticEnabled(!newValue);
      }
    });
  };

  return (
    <div className="flex items-center gap-2">
      <span className={`text-xs font-semibold uppercase tracking-wider transition-colors ${optimisticEnabled ? "text-red-400" : "text-slate-500"}`}>
        {optimisticEnabled ? "Hardcore" : "Free Play"}
      </span>
      <button
        onClick={handleToggle}
        disabled={isPending}
        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${optimisticEnabled ? "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]" : "bg-white/10"
          } ${isPending ? "opacity-50 cursor-not-allowed" : ""}`}
        role="switch"
        aria-checked={optimisticEnabled}
      >
        <span className="sr-only">Toggle Hardcore Mode</span>
        <span
          aria-hidden="true"
          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${optimisticEnabled ? "translate-x-4" : "translate-x-0"
            }`}
        />
      </button>
    </div>
  );
}
