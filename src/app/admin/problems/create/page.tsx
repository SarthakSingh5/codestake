import ProblemForm from "../components/ProblemForm";

export const metadata = {
  title: "Create Problem — CodeStake",
  description: "Add a new coding problem to the platform",
};

export default function CreateProblemPage() {
  return <ProblemForm mode="create" />;
}
