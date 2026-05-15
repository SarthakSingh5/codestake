import AuthForm from "../components/AuthForm";

export const metadata = {
  title: "Log in — CodeStake",
  description: "Log in to your CodeStake account",
};

export default function LoginPage() {
  return <AuthForm mode="login" />;
}
