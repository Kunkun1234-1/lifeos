"use client";

import { DashboardDataProvider } from "@/components/dashboard-data";
import { ProfilePanel } from "@/components/profile-panel";
import { HeroScene } from "@/components/hero-scene";
import { ModuleRow } from "@/components/module-row";
import {
  ScheduleCard,
  TasksCard,
  AssetsCard,
  AchievementsCard,
} from "@/components/right-cards";
import { useDashboard } from "@/hooks/queries";

export default function DashboardPage() {
  const dashboard = useDashboard();

  return (
    <DashboardDataProvider
      active={!dashboard.isError}
      data={dashboard.data}
    >
      <div className="mx-auto max-w-[1800px] space-y-5 px-8 py-6">
        <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)] 2xl:grid-cols-[280px_minmax(0,1fr)_520px]">
          <ProfilePanel />

          <div className="space-y-5 min-w-0">
            <HeroScene />
            <ModuleRow />
          </div>

          <div className="grid grid-cols-2 gap-4 content-start lg:col-span-2 lg:grid-cols-4 2xl:col-span-1 2xl:grid-cols-2">
            <ScheduleCard />
            <TasksCard />
            <AssetsCard />
            <AchievementsCard />
          </div>
        </div>
      </div>
    </DashboardDataProvider>
  );
}
