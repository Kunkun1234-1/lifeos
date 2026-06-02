"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

const DEFAULT_STALE_TIME = 2 * 60 * 1000;
const DEFAULT_GC_TIME = 30 * 60 * 1000;

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: DEFAULT_STALE_TIME,
            gcTime: DEFAULT_GC_TIME,
            refetchOnWindowFocus: false,
            refetchOnReconnect: false,
            retry: 1,
            retryDelay: 800,
          },
        },
      })
  );
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
