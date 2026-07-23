"use client";

import { useTransition } from "react";
import { LogOut } from "lucide-react";
import { logoutAction } from "@/actions/auth.actions";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";

export function LogoutMenuItem() {
  const [pending, startTransition] = useTransition();

  return (
    <DropdownMenuItem
      disabled={pending}
      onClick={() => startTransition(() => logoutAction())}
      className="cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive"
    >
      <LogOut className="mr-2 h-4 w-4" />
      {pending ? "Cerrando sesión..." : "Cerrar sesión"}
    </DropdownMenuItem>
  );
}
