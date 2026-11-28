import { Suspense } from "react";
import AuthForm from "../components/AuthForm";

export const metadata = {
  title: "Sign up — CodeStake",
  description: "Create your CodeStake account",
};

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f8f8f8]" />}>
      <AuthForm mode="signup" />
    </Suspense>
  );
}
