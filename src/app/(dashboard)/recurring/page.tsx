import { RecurringView } from "@/features/recurring/recurring-view";
import { getRecurringPageData } from "@/services/data.service";

export default async function RecurringPage() {
  const { recurring, accounts, categories, creditCards } =
    await getRecurringPageData();

  return (
    <RecurringView
      recurring={recurring}
      accounts={accounts.map((a) => ({ id: a.id, name: a.name }))}
      categories={categories.map((c) => ({
        id: c.id,
        name: c.name,
        type: c.type,
      }))}
      creditCards={creditCards}
    />
  );
}
