"use client";

import { useUrlParameter } from "@shared/lib/useUrlParameter";
import React from "react";
import PageHeader from "@shared/ui/page-header";
import Link from "next/link";
import { Plus } from "lucide-react";
import { useSession } from "@processes/auth/hooks";
import {
  FlowsSection,
  type FlowItemVM,
} from "@features/flows/ui/FlowSection";
import SearchInput from "@shared/ui/search-input";
import { useFlowsQuery } from "@features/flows/lib/useFlowsQuery";
import { Loading } from "@shared/ui/Loading";
import { Button } from "@shared/ui/controls";


export default function FlowsPage() {
  const { isAdmin } = useSession();
  const [search, setSearch] = useUrlParameter("q");
  const { data, isLoading, error, refetch } = useFlowsQuery(true);

  const handleSearchChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearch(e.target.value);
    },
    [setSearch]
  );

  const flows: FlowItemVM[] = React.useMemo(() => {
    if (!data?.flows) return [];
    return data.flows.map((f) => ({
      id: f.id,
      title: f.title,
      description: f.description ?? "",
      flowId: f.id,
      code: f.code,
    }));
  }, [data]);

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return flows;
    return flows.filter(
      (i) =>
        i.title.toLowerCase().includes(q) ||
        (i.description?.toLowerCase().includes(q) ?? false)
    );
  }, [search, flows]);

  return (
    <section className="flex w-full flex-col gap-6">
      <PageHeader
        title="Flows"
        subtitle="Build the steps and questions that guide each audit."
        className="mb-0"
        actionSlot={isAdmin ? <Link href="/flows/new" className="btn gap-2 whitespace-nowrap no-underline"><Plus className="h-4 w-4" aria-hidden="true" />Create Flow</Link> : undefined}
      />
      <div className="overflow-hidden rounded-lg border border-[var(--kma-border)] bg-[var(--kma-surface)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--kma-border)] px-4 py-4 sm:px-6">
          <div><h2 className="text-base font-semibold text-[var(--kma-fg)]">Audit templates</h2><p className="mt-1 text-xs text-[var(--kma-muted)]">{filtered.length} {filtered.length === 1 ? "template" : "templates"}{search ? " found" : " available"}</p></div>
          <div className="w-full sm:w-72">
            <SearchInput placeholder="Search flows..." aria-label="Search flows" value={search} onChange={handleSearchChange} />
          </div>
        </div>
        {error ? <div role="alert" className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--kma-border)] px-4 py-4 sm:px-6"><p className="text-sm text-[var(--kma-danger)]">Error loading flows: {error.message}</p><Button type="button" variant="secondary" fullWidth={false} onClick={() => refetch()}>Try again</Button></div> : null}
        {isLoading ? <Loading text="Loading flows…" /> : (
          <>
            <FlowsSection items={filtered} onDeleted={() => refetch()} />
            {filtered.length === 0 && !error ? <div className="px-5 py-12 text-center"><p className="font-semibold">{search ? "No flows match your search" : "No flow templates yet"}</p><p className="mt-1 text-sm text-[var(--kma-muted)]">{search ? "Try another name or clear the search." : "Create a template to guide auditors through an inspection."}</p>{search ? <Button type="button" variant="secondary" fullWidth={false} className="mt-4" onClick={() => setSearch("")}>Clear search</Button> : null}</div> : null}
          </>
        )}
      </div>
    </section>
  );
}
