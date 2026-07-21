import { GoalsView } from "@/features/goals/goals-view";
import { getSavingsGoals } from "@/services/data.service";

export default async function GoalsPage() {
  const goals = await getSavingsGoals();
  return <GoalsView goals={goals} />;
}
