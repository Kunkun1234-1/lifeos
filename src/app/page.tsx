"use client";

import { DashboardDataProvider } from "@/components/dashboard-data";
import { LifeGameDashboard } from "@/components/life-game-dashboard";
import { useDashboard } from "@/hooks/queries";

export default function DashboardPage() {
  const dashboard = useDashboard();

  return (
    <DashboardDataProvider
      active={!dashboard.isError}
      data={dashboard.data}
    >
      <LifeGameDashboard />
    </DashboardDataProvider>
  );
}
