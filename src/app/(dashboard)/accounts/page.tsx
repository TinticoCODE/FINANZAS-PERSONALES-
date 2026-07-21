import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { AccountList } from "@/features/accounts/account-list";
import { accounts } from "@/services/mock-data";

export default function AccountsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Cuentas"
        description="Administra tus cuentas bancarias y billeteras digitales"
        action={
          <Button size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            Nueva cuenta
          </Button>
        }
      />
      <AccountList accounts={accounts} />
    </div>
  );
}
