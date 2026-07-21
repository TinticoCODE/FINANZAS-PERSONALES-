import { CardsView } from "@/features/cards/cards-view";
import { getCreditCards } from "@/services/data.service";

export default async function CardsPage() {
  const cards = await getCreditCards();
  return <CardsView cards={cards} />;
}
