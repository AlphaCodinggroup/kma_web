"use client";

import React, { useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PublicEnv } from "@shared/config/env";

type Props = { children: ReactNode };

/**
 * QueryProvider
 * - Provee un QueryClient único por sesión de UI.
 * - Configura defaults (staleTime desde env, retry conservador, sin refetch en focus).
 * - No depende de UI ni estilos.
 */
export function QueryProvider({ children }: Props) {
  const [client] = useState<QueryClient>(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: PublicEnv.queryStaleTimeMs,
            retry: 2,
            refetchOnWindowFocus: false,
            refetchOnReconnect: true,
          },
          mutations: {
            retry: 0,
          },
        },
      })
  );

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

export default QueryProvider;
