"use client";

import React, { useRef, useState, type ReactNode } from "react";
import {
  MutationCache,
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { PublicEnv } from "@shared/config/env";
import { isApiError } from "@shared/interceptors/error";

type Props = { children: ReactNode };

/**
 * QueryProvider
 * - Provee un QueryClient único por sesión de UI.
 * - Configura defaults (staleTime desde env, retry conservador, sin refetch en focus).
 * - No depende de UI ni estilos.
 */
export function QueryProvider({ children }: Props) {
  const router = useRouter();
  const redirectingRef = useRef(false);

  const handleAuthError = (error: unknown) => {
    if (redirectingRef.current) return;
    if (isApiError(error) && error.code === "UNAUTHORIZED") {
      redirectingRef.current = true;
      client.clear();
      router.replace("/login");
      router.refresh();
    }
  };

  const [client] = useState<QueryClient>(
    () =>
      new QueryClient({
        queryCache: new QueryCache({
          onError: handleAuthError,
        }),
        mutationCache: new MutationCache({
          onError: handleAuthError,
        }),
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
