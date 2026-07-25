import { CardsView } from "@/features/cards/cards-view";
import { getAccounts, getCreditCards } from "@/services/data.service";

export default async function CardsPage() {
  const [cards, accounts] = await Promise.all([getCreditCards(), getAccounts()]);
  return <CardsView cards={cards} accounts={accounts} />;
}
