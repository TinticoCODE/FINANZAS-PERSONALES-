import type { ReactNode } from "react";
import { AppNavbar } from "@/components/layout/app-navbar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { MobileSidebar } from "@/components/layout/mobile-sidebar";
import { SidebarProvider } from "@/hooks/use-sidebar";
import { UserTimezoneProvider } from "@/contexts/user-timezone-context";
import { getSession } from "@/lib/session";
import { getUserTimezone } from "@/lib/user";
import { getReminders } from "@/services/data.service";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const [reminders, session, timezone] = await Promise.all([
    getReminders(),
    getSession(),
    getUserTimezone(),
  ]);

  return (
    <UserTimezoneProvider timezone={timezone}>
      <SidebarProvider>
        <div className="flex h-screen overflow-hidden bg-background">
          <AppSidebar />
          <MobileSidebar />
          <div className="flex flex-1 flex-col overflow-hidden">
            <AppNavbar
              reminders={reminders}
              userName={session?.name ?? "Admin"}
            />
            <main className="flex-1 overflow-y-auto">
              <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">{children}</div>
            </main>
          </div>
        </div>
      </SidebarProvider>
    </UserTimezoneProvider>
  );
}
