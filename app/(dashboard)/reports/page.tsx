"use client";

import React, { useEffect, useMemo, useState } from "react";
import ReportsSearchCard from "@features/reports/ui/ReportsSearchCard";
import ReportsListCard from "@features/reports/ui/ReportsListCard";
import type { ReportRowVM } from "@features/reports/ui/ReportsTable";
import PageHeader from "@shared/ui/page-header";
import { cn } from "@shared/lib/cn";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

const MOCK_ITEMS: ReportRowVM[] = [
  {
    id: "RPT-001",
    auditId: "AUD-1001",
    projectName: "Green Tower – Phase A",
    auditor: "María Pérez",
    reviewer: "Juan Gómez",
    generatedDate: new Date().toISOString(),
    totalFindings: 8,
    totalCost: 15400,
  },
  {
    id: "RPT-002",
    auditId: "AUD-1002",
    projectName: "Central Park Residences",
    auditor: "Lucas Ortega",
    reviewer: "Ana Díaz",
    generatedDate: new Date(Date.now() - 86400000).toISOString(),
    totalFindings: 12,
    totalCost: 28890,
  },
  {
    id: "RPT-003",
    auditId: "AUD-1003",
    projectName: "Harbor Logistics Hub",
    auditor: "Sofía Blanco",
    reviewer: "Pablo Ruiz",
    generatedDate: new Date(Date.now() - 2 * 86400000).toISOString(),
    totalFindings: 5,
    totalCost: 7200,
  },
];

// normaliza para búsqueda insensible a mayúsculas/acentos
function norm(s: string) {
  return (
    s
      .normalize("NFD")
      // @ts-expect-error: Unicode category needs 'u' flag
      .replace(/\p{Diacritic}/gu, "")
      .toLowerCase()
  );
}

export default function ReportsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const initialQ = searchParams.get("q") ?? "";
  const [query, setQuery] = useState(initialQ);

  // Mantener estado en sync si cambia el URL (back/forward)
  useEffect(() => {
    const next = searchParams.get("q") ?? "";
    if (next !== query) setQuery(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const filtered = useMemo(() => {
    const q = norm(query.trim());
    if (!q) return MOCK_ITEMS;

    return MOCK_ITEMS.filter((r) => {
      const haystack = [
        r.id,
        r.projectName,
        r.auditor,
        r.reviewer,
        new Date(r.generatedDate).toLocaleDateString(),
      ]
        .filter(Boolean)
        .map((v) => norm(String(v)));

      return haystack.some((v) => v.includes(q));
    });
  }, [query]);

  // Navegación -> reemplaza ?q= (debounced desde ReportsSearchCard)
  function updateQueryParam(next: string) {
    const sp = new URLSearchParams(searchParams.toString());
    const value = next.trim();
    if (value) sp.set("q", value);
    else sp.delete("q");

    const qs = sp.toString();
    const href = qs ? `${pathname}?${qs}` : pathname;
    router.replace(href, { scroll: false });
  }

  return (
    <main className={cn("min-h-dvh overflow-hidden bg-white p-6 md:p-8")}>
      {/* Page header */}
      <PageHeader
        title="Generated Reports"
        subtitle="View and download all audit reports"
      />

      {/* Search card */}
      <div className="mb-6">
        <ReportsSearchCard
          value={query}
          onValueChange={setQuery}
          onDebouncedChange={updateQueryParam}
          placeholder="Search by project name, auditor, or report ID…"
          debounceMs={350}
        />
      </div>

      {/* List card con tabla (usa filtrados) */}
      <ReportsListCard
        items={filtered}
        totalCount={filtered.length}
        description="Complete list of generated audit reports"
        bodyMaxHeightClassName="max-h-[560px]"
      />
    </main>
  );
}
