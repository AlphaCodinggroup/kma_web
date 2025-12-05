import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import type { DashboardSummary } from "@entities/dashboard/model/dashboard";
import type { ApiError } from "@shared/interceptors/error";
import { getDashboardSummary } from "@features/dashboard/lib/usecases/get-dashboard-summary";

export const dashboardSummaryKey = ["dashboard", "summary"] as const;

type Options = Omit<
  UseQueryOptions<
    DashboardSummary,
    ApiError,
    DashboardSummary,
    typeof dashboardSummaryKey
  >,
  "queryKey" | "queryFn"
>;

export function useDashboardSummary(options?: Options) {
  return useQuery<
    DashboardSummary,
    ApiError,
    DashboardSummary,
    typeof dashboardSummaryKey
  >({
    queryKey: dashboardSummaryKey,
    queryFn: () => getDashboardSummary(),
    staleTime: 60_000,
    retry: 2,
    refetchOnWindowFocus: false,
    ...options,
  });
}
