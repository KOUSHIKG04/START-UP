"use client";

import {
  isServer,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import type { ReactNode } from "react";

function createQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
  });
}

let browserClient: QueryClient | undefined;

export function QueryProvider({ children }: { children: ReactNode }) {
  const client = isServer
    ? createQueryClient()
    : (browserClient ??= createQueryClient());
    
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
