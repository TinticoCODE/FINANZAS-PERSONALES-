import { AccountsView } from "@/features/accounts/accounts-view";
import { getAccounts } from "@/services/data.service";

export default async function AccountsPage() {
  const accounts = await getAccounts();
  return <AccountsView accounts={accounts} />;
}
