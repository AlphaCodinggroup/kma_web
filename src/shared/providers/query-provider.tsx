"use client";

import React, { useRef, useState, type ReactNode } from "react";
import {
  MutationCache,
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { isApiError } from "@shared/interceptors/error";

type Props = { children: ReactNode };

/**
 * QueryProvider
 * - Provee un QueryClient único por sesión de UI.
 * - Configura defaults optimizados para performance (staleTime 2min, gcTime 5min).
 * - Redirige automáticamente a /login si detecta UNAUTHORIZED después de que
 *   el interceptor de auth falló en refrescar la sesión.
 */
export function QueryProvider({ children }: Props) {
  const redirectingRef = useRef(false);

  const handleAuthError = (error: unknown) => {
    if (redirectingRef.current) return;
    if (isApiError(error) && error.code === "UNAUTHORIZED") {
      redirectingRef.current = true;
      client.clear();
      // Hard redirect — ensures browser clears all in-memory state
      window.location.href = "/login";
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
            staleTime: 2 * 60 * 1000, // 2 minutes - industry standard
            gcTime: 5 * 60 * 1000,    // 5 minutes garbage collection
            retry: (failureCount, error) => {
              // Never retry on auth errors — the interceptor already tried refresh
              if (isApiError(error) && error.code === "UNAUTHORIZED") return false;
              return failureCount < 2;
            },
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
