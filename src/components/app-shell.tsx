"use client";

import { usePathname } from "next/navigation";
import { TopNav } from "@/components/top-nav";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hasStandaloneChrome = pathname.startsWith("/achievements");

  return (
    <div className="relative min-h-screen">
      {hasStandaloneChrome ? null : <TopNav />}
      <main className="relative z-10">{children}</main>
    </div>
  );
}
