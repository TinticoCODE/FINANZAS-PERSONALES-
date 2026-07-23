import { LoansView } from "@/features/loans/loans-view";
import { getLoansData } from "@/services/data.service";

export default async function LoansPage() {
  const { loans, accounts } = await getLoansData();

  return <LoansView loans={loans} accounts={accounts} />;
}
