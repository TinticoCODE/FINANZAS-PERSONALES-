"use client";

import { LogOut } from "lucide-react";
import { logoutAction } from "@/actions/auth.actions";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";

export function LogoutMenuItem() {
  return (
    <DropdownMenuItem
      onClick={() => logoutAction()}
      className="text-destructive focus:text-destructive"
    >
      <LogOut className="mr-2 h-4 w-4" />
      Cerrar sesión
    </DropdownMenuItem>
  );
}
