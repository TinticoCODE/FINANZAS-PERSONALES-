import type { ReactNode } from "react";
import { AppNavbar } from "@/components/layout/app-navbar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { MobileSidebar } from "@/components/layout/mobile-sidebar";
import { SidebarProvider } from "@/hooks/use-sidebar";
import { getSession } from "@/lib/session";
import { getReminders, getSearchData } from "@/services/data.service";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const [reminders, searchData, session] = await Promise.all([
    getReminders(),
    getSearchData(),
    getSession(),
  ]);

  return (
    <SidebarProvider>
      <div className="flex h-screen overflow-hidden bg-background">
        <AppSidebar />
        <MobileSidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <AppNavbar
            reminders={reminders}
            searchData={searchData}
            userName={session?.name ?? "Admin"}
          />
          <main className="flex-1 overflow-y-auto">
            <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">{children}</div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
