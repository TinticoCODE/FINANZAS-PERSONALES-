"use client";

import { createContext, useContext, type ReactNode } from "react";
import { DEFAULT_TIMEZONE } from "@/domain/billing/timezone";

const UserTimezoneContext = createContext(DEFAULT_TIMEZONE);

export function UserTimezoneProvider({
  timezone,
  children,
}: {
  timezone: string;
  children: ReactNode;
}) {
  return (
    <UserTimezoneContext.Provider value={timezone}>
      {children}
    </UserTimezoneContext.Provider>
  );
}

export function useUserTimezone() {
  return useContext(UserTimezoneContext);
}
