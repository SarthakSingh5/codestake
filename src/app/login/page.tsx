import { Suspense } from "react";
import AuthForm from "../components/AuthForm";

export const metadata = {
  title: "Log in — CodeStake",
  description: "Log in to your CodeStake account",
};

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f8f8f8]" />}>
      <AuthForm mode="login" />
    </Suspense>
  );
}
