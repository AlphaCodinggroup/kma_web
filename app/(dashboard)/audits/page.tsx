"use client";

import React, { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import AuditsTable, { type AuditRowVM } from "@features/audits/ui/AuditsTable";
import AuditsToolbar from "@features/audits/ui/AuditsToolBar";
import { cn } from "@shared/lib/cn";
import PageHeader from "@shared/ui/page-header";

/** Datos de ejemplo SOLO VISUAL (luego se conectará a repos/usecases) */
const MOCK_AUDITS: AuditRowVM[] = [
  {
    id: "A-000341",
    project: "Central Park Tower",
    auditor: "María López",
    status: "completed",
    auditDate: "2025-08-22",
  },
  {
    id: "A-000342",
    project: "Harbor Point Offices",
    auditor: "Juan Pérez",
    status: "in_review",
    auditDate: "2025-08-23",
  },
  {
    id: "A-000343",
    project: "West End Mall",
    auditor: "Sofía García",
    status: "pending_review",
    auditDate: "2025-08-25",
  },
  {
    id: "A-000344",
    project: "Riverside Residences",
    auditor: "Luciano Díaz",
    status: "completed",
    auditDate: "2025-08-28",
  },
  {
    id: "A-000345",
    project: "Greenfield Plant",
    auditor: "Carla Méndez",
    status: "in_review",
    auditDate: "2025-09-01",
  },
  {
    id: "A-000346",
    project: "Sunset Logistics Hub",
    auditor: "Pablo Fernández",
    status: "pending_review",
    auditDate: "2025-09-03",
  },
  {
    id: "A-000347",
    project: "Aurora Business Park",
    auditor: "Noelia Castro",
    status: "completed",
    auditDate: "2025-09-04",
  },
  {
    id: "A-000348",
    project: "Metro Health Center",
    auditor: "Tomás Ratti",
    status: "in_review",
    auditDate: "2025-09-05",
  },
];

const AuditsPage: React.FC = () => {
  const router = useRouter();
  const [query, setQuery] = useState<string>("");

  const filtered = useMemo<AuditRowVM[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) return MOCK_AUDITS;
    return MOCK_AUDITS.filter((row) => {
      return (
        row.id.toLowerCase().includes(q) ||
        row.project.toLowerCase().includes(q) ||
        row.auditor.toLowerCase().includes(q)
      );
    });
  }, [query]);

  const handleEdit = useCallback(
    (id: string) => {
      const href = `/audits/${encodeURIComponent(
        id
      )}/edit` as Route<`/audits/${string}/edit`>;
      router.push(href);
    },
    [router]
  );

  return (
    <main className={cn("min-h-dv hoverflow-hidden bg-white")}>
      <PageHeader title="Audits" subtitle="Manage all system audits" />
      <div
        className={cn(
          "w-full rounded-xl border border-gray-200 bg-white px-4 py-3"
        )}
      >
        <AuditsToolbar
          searchValue={query}
          onSearchChange={setQuery}
          searchPlaceholder="Search audits…"
          onFiltersClick={() => {}}
        />
        <AuditsTable items={filtered} onEdit={handleEdit} />
      </div>
    </main>
  );
};

export default AuditsPage;
