import { TransactionsView } from "@/features/transactions/transactions-view";
import {
  getAccounts,
  getCategories,
  getCreditCards,
  getTransactions,
} from "@/services/data.service";

export default async function TransactionsPage() {
  const [transactions, accounts, categories, creditCards] = await Promise.all([
    getTransactions(),
    getAccounts(),
    getCategories(),
    getCreditCards(),
  ]);

  return (
    <TransactionsView
      transactions={transactions}
      accounts={accounts.map((a) => ({ id: a.id, name: a.name }))}
      categories={categories.map((c) => ({ id: c.id, name: c.name, type: c.type }))}
      creditCards={creditCards.map((c) => ({ id: c.id, name: c.name }))}
    />
  );
}
