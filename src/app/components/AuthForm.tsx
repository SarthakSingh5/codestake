"use client";

import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import { Provider } from "@supabase/supabase-js";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type SocialProvider = {
  id: Provider;
  label: string;
  icon: React.ReactNode;
};

const SOCIAL_PROVIDERS: SocialProvider[] = [
  {
    id: "google",
    label: "Google",
    icon: (
      <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
      </svg>
    ),
  },
];

type AuthFormProps = {
  mode: "signup" | "login";
};

export default function AuthForm({ mode }: AuthFormProps) {
  const supabase = getSupabaseBrowserClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<{ text: string; error: boolean } | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setStatus(null);

    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) {
        setStatus({ text: error.message, error: true });
      } else {
        router.push("/login");
      }
    } else {
      const { error, data } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setStatus({ text: error.message, error: true });
      } else {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", data.user.id)
          .single() as { data: { role: string } | null };

        router.push(profile?.role === "admin" ? "/admin" : "/");
      }
    }

    setLoading(false);
  }

  async function handleSocialLogin(provider: Provider) {
    await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        skipBrowserRedirect: false,
      },
    });
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

          {/* Email + password form */}
          <form id={`form-${mode}`} onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div>
              <label htmlFor={`${mode}-email`} className="block text-xs font-black uppercase tracking-wider text-black mb-1">
                Email
              </label>
              <input
                id={`${mode}-email`}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@email.com"
                className="w-full border-4 border-black bg-white px-3.5 py-2 text-sm font-bold text-black placeholder-gray-400 shadow-[3px_3px_0_0_#000] focus:bg-[#ffcc00]/10 focus:outline-none transition rounded-none"
              />
            </div>
            <div>
              <label htmlFor={`${mode}-password`} className="block text-xs font-black uppercase tracking-wider text-black mb-1">
                Password
              </label>
              <input
                id={`${mode}-password`}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                placeholder="At least 6 characters"
                className="w-full border-4 border-black bg-white px-3.5 py-2 text-sm font-bold text-black placeholder-gray-400 shadow-[3px_3px_0_0_#000] focus:bg-[#ffcc00]/10 focus:outline-none transition rounded-none"
              />
            </div>

            <button
              id={`btn-${mode}-submit`}
              type="submit"
              disabled={loading}
              className="nb-btn nb-btn-primary w-full py-3 text-sm font-black uppercase tracking-wider shadow-[4px_4px_0_0_#000] disabled:opacity-50"
            >
              {loading ? "AUTHENTICATING..." : isSignup ? "CREATE ACCOUNT" : "LOG IN"}
            </button>

            {status && (
              <div
                className={`text-xs font-bold uppercase p-2 border-2 border-black text-center ${
                  status.error ? "bg-[#ff3333] text-white" : "bg-[#00ff66] text-black"
                }`}
                role="status"
                aria-live="polite"
              >
                {status.text}
              </div>
            )}
          </form>

          {/* Social providers */}
          {SOCIAL_PROVIDERS.length > 0 && (
            <>
              <div className="relative flex items-center gap-3 my-5">
                <div className="h-0.5 flex-1 bg-black" />
                <span className="text-[10px] font-black uppercase tracking-widest text-black">OR</span>
                <div className="h-0.5 flex-1 bg-black" />
              </div>

              <div className="flex flex-col gap-2.5">
                {SOCIAL_PROVIDERS.map((provider) => (
                  <button
                    key={provider.id}
                    id={`btn-${mode}-${provider.id}`}
                    type="button"
                    onClick={() => handleSocialLogin(provider.id)}
                    className="nb-btn w-full py-2.5 px-4 text-xs font-black uppercase flex items-center justify-center gap-2 bg-white shadow-[3px_3px_0_0_#000]"
                  >
                    {provider.icon}
                    Continue with {provider.label}
                  </button>
                ))}
              </div>
            </>
          )}

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
