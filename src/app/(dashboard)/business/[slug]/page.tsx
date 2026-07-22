import { notFound } from "next/navigation";
import { BusinessDashboard } from "@/features/business/business-dashboard";
import { getBusinessDashboard } from "@/services/business-data.service";

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function BusinessDetailPage({ params }: Props) {
  const { slug } = await params;
  const data = await getBusinessDashboard(slug);
  if (!data) notFound();
  return <BusinessDashboard data={data} />;
}
