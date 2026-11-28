"use client";

import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import { Provider } from "@supabase/supabase-js";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

type SocialProvider = {
  id: Provider;
  label: string;
  buttonClass: string;
  icon: React.ReactNode;
};

const SOCIAL_PROVIDERS: SocialProvider[] = [
  {
    id: "google",
    label: "Google",
    buttonClass: "bg-white text-black hover:bg-[#ffcc00]",
    icon: (
      <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
      </svg>
    ),
  },
  {
    id: "github",
    label: "GitHub",
    buttonClass: "bg-black text-white hover:bg-neutral-800",
    icon: (
      <svg className="h-5 w-5 shrink-0 fill-current" viewBox="0 0 24 24" aria-hidden="true">
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
        />
      </svg>
    ),
  },
];

type AuthFormProps = {
  mode: "signup" | "login";
};

export default function AuthForm({ mode }: AuthFormProps) {
  const supabase = getSupabaseBrowserClient();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loadingProvider, setLoadingProvider] = useState<Provider | null>(null);
  const searchParams = useSearchParams();

  const urlError = searchParams.get("error");
  const displayedError = errorMessage ?? urlError;

  async function handleSocialLogin(provider: Provider) {
    setErrorMessage(null);
    setLoadingProvider(provider);
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        skipBrowserRedirect: false,
      },
    });
    if (error) {
      setErrorMessage(error.message);
      setLoadingProvider(null);
    }
  }

  const isSignup = mode === "signup";

  return (
    <div className="min-h-screen bg-[#f8f8f8] flex items-center justify-center px-4 font-sans">
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="mb-6 text-center">
          <Link href="/" className="inline-block bg-white border-4 border-black px-5 py-2 shadow-[4px_4px_0_0_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_0_#000] transition-all">
            <span className="text-2xl font-black uppercase tracking-tighter text-black">CodeStake</span>
          </Link>
          <p className="mt-3 text-xs font-black uppercase tracking-widest text-black bg-[#ffcc00] border-2 border-black inline-block px-2 py-0.5 shadow-[2px_2px_0_0_#000]">
            {isSignup ? "Create your account" : "Enter the Arena"}
          </p>
        </div>

        {/* Card */}
        <div className="nb-box p-6 border-4 border-black bg-white shadow-[8px_8px_0_0_#000] relative">
          <div className="absolute top-0 left-0 w-full h-2 bg-[#00ff66] border-b-4 border-black" />

          <div className="mt-2 space-y-4">
            <p className="text-xs font-bold text-black/80 text-center leading-relaxed">
              {isSignup
                ? "Sign up in one click to verify your account and sync the Chrome Extension."
                : "Sign in with your verified developer account to access your ledger & extension."}
            </p>

            {/* Social OAuth providers */}
            <div className="flex flex-col gap-3">
              {SOCIAL_PROVIDERS.map((provider) => {
                const isBusy = loadingProvider === provider.id;
                return (
                  <button
                    key={provider.id}
                    id={`btn-${mode}-${provider.id}`}
                    type="button"
                    disabled={loadingProvider !== null}
                    onClick={() => handleSocialLogin(provider.id)}
                    className={`nb-btn w-full py-3 px-4 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2.5 shadow-[4px_4px_0_0_#000] disabled:opacity-60 ${provider.buttonClass}`}
                  >
                    {provider.icon}
                    {isBusy ? `Connecting ${provider.label}...` : `Continue with ${provider.label}`}
                  </button>
                );
              })}
            </div>

            {isSignup && (
              <p className="text-[11px] text-neutral-600 font-medium text-center leading-tight pt-1">
                By signing up, you certify you are 18+ and agree to our{" "}
                <Link href="/terms" target="_blank" className="font-bold underline text-black hover:bg-[#ffcc00] px-0.5">
                  Terms &amp; Policies
                </Link>
                .
              </p>
            )}

            {displayedError && (
              <div
                className="text-xs font-bold uppercase p-2 border-2 border-black text-center bg-[#ff3333] text-white"
                role="status"
                aria-live="polite"
              >
                {displayedError}
              </div>
            )}
          </div>

          {/* Switch mode */}
          <div className="mt-6 pt-4 border-t-2 border-black text-center text-xs font-bold text-black">
            {isSignup ? "Already have an account? " : "Don't have an account? "}
            <Link
              href={isSignup ? "/login" : "/signup"}
              className="text-black font-black uppercase underline hover:bg-[#ffcc00] px-1 transition"
            >
              {isSignup ? "Log in" : "Sign up"}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
