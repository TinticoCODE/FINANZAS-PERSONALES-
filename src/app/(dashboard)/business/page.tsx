import { BusinessListView } from "@/features/business/business-list-view";
import { getBusinessesList } from "@/services/business-data.service";

export default async function BusinessPage() {
  const businesses = await getBusinessesList();
  return <BusinessListView businesses={businesses} />;
}
