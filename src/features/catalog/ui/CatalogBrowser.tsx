"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { CatalogItem, CatalogItemsQuery, CatalogVersion } from "@entities/catalog/model/catalog";
import { catalogRepo } from "../api/catalog.repo.impl";
import { normalizeCatalogError } from "../api/catalog-error";
import { Button, Input, Label } from "@shared/ui/controls";
import { Card } from "@shared/ui/card";

const fields = ["version", "q", "flow_id", "barrier_id", "cursor"] as const;
function fromURL(): CatalogItemsQuery {
  const params = new URLSearchParams(window.location.search);
  return Object.fromEntries(fields.flatMap(key => params.get(key) ? [[key, params.get(key)!]] : []));
}
function writeURL(value: CatalogItemsQuery) {
  const url = new URL(window.location.href);
  for (const key of fields) {
    if (value[key]) url.searchParams.set(key, value[key]!);
    else url.searchParams.delete(key);
  }
  window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
}
const text = (value: string | number | null | undefined) => value == null || value === "" ? "Unknown" : String(value);

export default function CatalogBrowser({ versions, activeVersion }: { versions: CatalogVersion[]; activeVersion?: string | undefined }) {
  const client = useQueryClient();
  const [query, setQuery] = useState<CatalogItemsQuery | null>(null);
  const [draft, setDraft] = useState<CatalogItemsQuery>({});
  const [previous, setPrevious] = useState<CatalogItemsQuery[]>([]);
  const [detail, setDetail] = useState<CatalogItem | null>(null);
  useEffect(() => {
    const sync = () => { const value = fromURL(); setQuery(value); setDraft(value); setPrevious([]); setDetail(null); };
    sync();
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);
  const page = useQuery({
    queryKey: ["catalog", "items", query],
    queryFn: ({ signal }) => catalogRepo.items({ limit: 50, ...query }, signal),
    enabled: query !== null,
    retry: false,
    staleTime: 30000,
  });
  // Fija el snapshot después de la primera lectura; las siguientes páginas nunca usan "active".
  useEffect(() => {
    if (!query || !page.data || (query.version && query.version !== "active")) return;
    const value = { ...query, version: page.data.version };
    client.setQueryData(["catalog", "items", value], page.data);
    setQuery(value); setDraft(value); writeURL(value);
  }, [page.data, query, client]);
  const navigate = (value: CatalogItemsQuery) => { setQuery(value); setDraft(value); setDetail(null); writeURL(value); };
  const version = query?.version ?? "active";
  const options = new Map(versions.map(v => [v.version, v.file_name]));
  if (activeVersion) options.set(activeVersion, `${options.get(activeVersion) ?? activeVersion} · Active`);
  if (version !== "active" && version !== "legacy" && !options.has(version)) options.set(version, version);
  return <Card className="space-y-4 p-5">
    <h2 className="font-semibold">Browse catalog</h2>
    <p className="text-sm text-[var(--kma-muted)]">Explore a snapshot before restoring it. Browsing does not change the active catalog.</p>
    <Button variant="secondary" fullWidth={false} disabled={!activeVersion} onClick={() => { const { cursor: _cursor, ...filters } = draft; void _cursor; setPrevious([]); navigate({ ...filters, version: activeVersion ?? "active" }); }}>View active catalog</Button>
    <form className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" onSubmit={event => {
      event.preventDefault(); setPrevious([]);
      const { cursor: _cursor, ...filters } = draft; void _cursor;
      navigate(filters);
    }}>
      <div><Label htmlFor="catalog-version">Catalog version</Label><select id="catalog-version" name="version" value={draft.version ?? "active"} onChange={event => { setPrevious([]); const { cursor: _cursor, ...filters } = draft; void _cursor; navigate({ ...filters, version: event.target.value }); }} className="kma-field w-full rounded border border-[var(--kma-border)] bg-[var(--kma-surface)] px-3 py-2 text-sm">
        <option value="active">Current active catalog</option><option value="legacy">Legacy catalog</option>
        {[...options].map(([id, label]) => <option key={id} value={id}>{label}</option>)}
      </select></div>
      <div><Label htmlFor="catalog-search">Search catalog</Label><Input id="catalog-search" name="q" value={draft.q ?? ""} onChange={event => setDraft({ ...draft, q: event.target.value })} placeholder="Code, question or mitigation" /></div>
      <div><Label htmlFor="catalog-flow">Flow ID</Label><Input id="catalog-flow" name="flow_id" value={draft.flow_id ?? ""} onChange={event => setDraft({ ...draft, flow_id: event.target.value })} /></div>
      <div><Label htmlFor="catalog-barrier">Barrier ID</Label><Input id="catalog-barrier" name="barrier_id" value={draft.barrier_id ?? ""} onChange={event => setDraft({ ...draft, barrier_id: event.target.value })} /></div>
      <Button type="submit" fullWidth={false} variant="secondary">Apply filters</Button>
    </form>
    {page.isPending && <p role="status">Loading catalog records…</p>}
    {page.error && <div role="alert"><p>{normalizeCatalogError(page.error).message}</p><Button variant="secondary" fullWidth={false} onClick={() => void page.refetch()}>Retry catalog records</Button></div>}
    {page.data && <>
      <p className="break-all text-xs text-[var(--kma-muted)]">Viewing version {page.data.version} · {page.data.items.length} records on this page</p>
      {page.data.items.length === 0 && <p role="status">No records on this page.{page.data.next_cursor ? " Continue to search the next page." : " Try different filters."}</p>}
      {page.data.items.length > 0 && <div className="overflow-x-auto"><table className="w-full min-w-[640px] text-left text-sm"><caption className="sr-only">Catalog records</caption><thead><tr>{["Flow", "Barrier", "Code", "Question", "Cost", "Unit", "Details"].map(label => <th scope="col" key={label} className="px-2 py-3">{label}</th>)}</tr></thead><tbody>{page.data.items.map(item => <tr key={`${item.flow_id}:${item.catalog_item_id}`} className="border-t border-[var(--kma-border)]"><td className="px-2 py-3">{text(item.flow_id)}</td><td className="px-2 py-3">{text(item.barrier_id)}</td><td className="px-2 py-3">{text(item.question_code)}</td><td className="max-w-sm whitespace-normal px-2 py-3">{text(item.question)}</td><td className="px-2 py-3">{text(item.cost)}</td><td className="px-2 py-3">{text(item.unit)}</td><td className="px-2 py-3"><Button variant="secondary" fullWidth={false} aria-label={`Details ${item.question_code ?? item.catalog_item_id}`} aria-expanded={detail?.catalog_item_id === item.catalog_item_id} onClick={() => setDetail(item)}>Details</Button></td></tr>)}</tbody></table></div>}
      <div className="flex flex-wrap gap-3"><Button fullWidth={false} variant="secondary" disabled={previous.length === 0 || page.isFetching} onClick={() => { const value = previous.at(-1); if (value) { setPrevious(previous.slice(0, -1)); navigate(value); } }}>Previous page</Button><Button fullWidth={false} variant="secondary" disabled={!page.data.next_cursor || page.isFetching} onClick={() => { if (query && page.data.next_cursor) { setPrevious([...previous, query]); navigate({ ...query, version: page.data.version, cursor: page.data.next_cursor }); } }}>Next page</Button></div>
    </>}
    {detail && <section aria-label="Catalog record details" className="space-y-3 rounded border border-[var(--kma-border)] p-4"><h3 className="font-semibold">Record details</h3><dl className="grid gap-3 sm:grid-cols-2">{[["Item ID", detail.catalog_item_id], ["Flow", detail.flow_id], ["Barrier ID", detail.barrier_id], ["Question code", detail.question_code], ["Question", detail.question], ["Mitigation ID", detail.mitigation_id], ["Barrier", detail.barrier_statement], ["Mitigation", detail.proposed_mitigation], ["Reference", detail.adas_reference], ["Cost", detail.cost], ["Unit", detail.unit]].map(([label, value]) => <div key={label}><dt className="text-sm text-[var(--kma-muted)]">{label}</dt><dd className="break-words text-sm">{text(value)}</dd></div>)}</dl><Button variant="secondary" fullWidth={false} onClick={() => setDetail(null)}>Close details</Button></section>}
  </Card>;
}
