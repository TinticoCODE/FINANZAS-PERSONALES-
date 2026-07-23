import { GoalsView } from "@/features/goals/goals-view";
import { getAccounts, getSavingsGoals } from "@/services/data.service";

export default async function GoalsPage() {
  const [goals, accounts] = await Promise.all([
    getSavingsGoals(),
    getAccounts(),
  ]);
  return <GoalsView goals={goals} accounts={accounts} />;
}
