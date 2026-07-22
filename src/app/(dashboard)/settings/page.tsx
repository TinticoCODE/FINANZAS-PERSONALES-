import { SettingsView } from "@/features/settings/settings-view";
import { getDefaultUser } from "@/lib/user";

export default async function SettingsPage() {
  const user = await getDefaultUser();

  return <SettingsView timezone={user.timezone} />;
}
