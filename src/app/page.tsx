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
      <div className="mx-auto max-w-[2048px] px-4 pb-4 pt-4 sm:px-5 2xl:px-7">
        <div className="grid gap-4 xl:min-h-[calc(100vh-104px)] xl:grid-cols-[300px_minmax(500px,1fr)_500px] xl:grid-rows-[minmax(460px,1fr)_230px] 2xl:grid-cols-[360px_minmax(680px,1fr)_680px] 2xl:grid-rows-[minmax(640px,1fr)_250px]">
          <div className="panel-cream framed order-2 rounded-sm p-5 lg:order-1 xl:row-span-2 xl:h-full xl:overflow-hidden">
            <ProfilePanel />
          </div>

          <div className="order-1 min-w-0 lg:order-2 xl:h-full">
            <HeroScene />
          </div>

          <div className="order-4 grid content-start gap-4 sm:grid-cols-2 lg:col-span-2 xl:order-3 xl:col-span-1 xl:h-full xl:min-h-0 xl:grid-cols-2 xl:grid-rows-[1.08fr_0.92fr] xl:content-stretch">
            <ScheduleCard />
            <TasksCard />
            <AssetsCard />
            <AchievementsCard />
          </div>

          <div className="order-3 min-w-0 lg:col-span-2 xl:order-4 xl:col-span-2 xl:col-start-2 xl:h-full">
            <ModuleRow />
          </div>
        </div>
      </div>
    </DashboardDataProvider>
  );
}
