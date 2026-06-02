"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { DashboardSnapshotDTO } from "@/lib/types";

type DashboardDataContextValue = {
  active: boolean;
  data?: DashboardSnapshotDTO;
};

const DashboardDataContext = createContext<DashboardDataContextValue>({
  active: false,
});

export function DashboardDataProvider({
  active = true,
  data,
  children,
}: {
  active?: boolean;
  data?: DashboardSnapshotDTO;
  children: ReactNode;
}) {
  return (
    <DashboardDataContext.Provider value={{ active, data }}>
      {children}
    </DashboardDataContext.Provider>
  );
}

export function useDashboardData() {
  return useContext(DashboardDataContext);
}
