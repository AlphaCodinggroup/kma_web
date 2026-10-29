"use client";

import { useCatalogManager } from "../lib/hooks/useCatalogManager";
import CatalogBrowser from "./CatalogBrowser";
import { PublicEnv } from "@shared/config/env";
import PageHeader from "@shared/ui/page-header";
import { Button, Input, Label } from "@shared/ui/controls";
import { Card } from "@shared/ui/card";
import ConfirmDialog from "@shared/ui/confirm-dialog";

export default function CatalogManager() {
  const model = useCatalogManager();
  const number = (value: number | null | undefined) =>
    value == null ? "Unknown" : value.toLocaleString(PublicEnv.locale);
  const preview = model.validation?.preview;
  return (
    <div className="min-w-0 space-y-6">
      <PageHeader
        title="Catalog"
        subtitle="Validate an XLSX file, replace the environment catalog, or restore a complete version."
      />
      {model.error && (
        <p
          role="alert"
          className="rounded-lg border border-[var(--kma-danger-border)] bg-[var(--kma-danger-bg)] p-4 text-sm text-[var(--kma-danger)]"
        >
          {model.error}
        </p>
      )}
      {model.result && (
        <div
          role="status"
          className="rounded-lg border border-[var(--kma-border)] bg-[var(--kma-surface)] p-4 text-sm"
        >
          <p className="font-medium">{model.result.message}</p>
          {model.result.total_items != null && <p>{number(model.result.processed_items ?? 0)} / {number(model.result.total_items)} records processed</p>}
          <p className="mt-1 break-all text-[var(--kma-muted)]">
            Operation {model.result.operation_id} · {model.result.status}
            {model.result.version ? ` · Version ${model.result.version}` : ""}
            {model.result.revision
              ? ` · Revision ${model.result.revision}`
              : ""}
          </p>
        </div>
      )}
      {model.pending && (
        <Card className="space-y-3 p-5">
          <h2 className="font-semibold">Catalog operation in progress</h2>
          <p className="break-all text-sm text-[var(--kma-muted)]">
            Operation {model.pending.id}; status is checked automatically.
          </p>
          <Button
            fullWidth={false}
            variant="secondary"
            disabled={model.busy || model.preparingRetry}
            isLoading={model.busy}
            onClick={() => void model.reconcile()}
          >
            Check operation status
          </Button>
          {model.recoveryAllowed && model.recoveryAvailable && (
            <div className="space-y-3 border-t border-[var(--kma-border)] pt-4">
              <p className="text-sm text-[var(--kma-muted)]">No saved result was found; retry only the same operation with its original revision. The server will return the saved result if the first request arrives later.</p>
              {model.pending.kind === "upload" && (
                <div>
                  <Label htmlFor="catalog-retry-file">Original XLSX file</Label>
                  <Input id="catalog-retry-file" type="file" accept=".xlsx" disabled={model.busy} aria-describedby="catalog-retry-help" onChange={event => void model.prepareRetryFile(event.target.files?.[0] ?? null)} />
                  <p id="catalog-retry-help" className="mt-1 break-all text-xs text-[var(--kma-muted)]">Select “{model.pending.file_name}”; its SHA-256 must match {model.pending.sha256}. File contents are not saved in session storage.</p>
                  {model.preparingRetry && <p role="status" className="mt-2 text-sm text-[var(--kma-muted)]">Checking original file…</p>}
                  {model.retryFile && <p role="status" className="mt-2 text-sm text-[var(--kma-muted)]">Original file verified; the original revision will be reused.</p>}
                </div>
              )}
              <Button variant="secondary" fullWidth={false} disabled={!model.canRetry} onClick={model.requestRetry}>Retry same operation</Button>
            </div>
          )}
        </Card>
      )}
      <Card className="space-y-4 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h2 className="font-semibold">Active catalog</h2>
          <Button
            variant="secondary"
            fullWidth={false}
            disabled={model.loading || model.busy}
            onClick={() => void model.refresh()}
          >
            Refresh catalog
          </Button>
        </div>
        {model.loading ? (
          <p role="status" className="text-sm text-[var(--kma-muted)]">
            Loading catalog…
          </p>
        ) : model.status ? (
          <dl className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <dt className="text-[var(--kma-muted)]">Version</dt>
              <dd className="mt-1 break-all font-medium">
                {model.status.active_version}
              </dd>
            </div>
            <div>
              <dt className="text-[var(--kma-muted)]">Revision</dt>
              <dd className="mt-1 break-all">{model.status.revision}</dd>
            </div>
            <div>
              <dt className="text-[var(--kma-muted)]">Items</dt>
              <dd className="mt-1">
                {number(model.status.active?.item_count)}
              </dd>
            </div>
            <div>
              <dt className="text-[var(--kma-muted)]">Flows</dt>
              <dd className="mt-1">
                {number(model.status.active?.flow_count)}
              </dd>
            </div>
          </dl>
        ) : (
          <p className="text-sm text-[var(--kma-muted)]">
            Catalog status is unavailable.
          </p>
        )}
        {model.status && !model.status.enabled && (
          <p role="status" className="text-sm text-[var(--kma-muted)]">
            Catalog changes are currently disabled for this environment.
          </p>
        )}
      </Card>
      <CatalogBrowser versions={model.history} activeVersion={model.status?.active_version} revision={model.status?.revision} canChange={model.canChange} busy={model.busy || Boolean(model.pending)} result={model.result} error={model.error} onSave={model.mutate} />
      <Card className="space-y-4 p-5">
        <h2 className="font-semibold">Recent operations</h2>
        {model.operationsError && <p role="alert">{model.operationsError}</p>}
        {model.recentOperations.length === 0 && <p className="text-sm text-[var(--kma-muted)]">No recent operations.</p>}
        <ul className="space-y-2 text-sm">{model.recentOperations.map(operation => <li key={operation.operation_id} className="break-words border-t border-[var(--kma-border)] py-2"><p>{operation.file_name ?? operation.kind} · {operation.status}</p><p className="text-xs text-[var(--kma-muted)]">{operation.operation_id}</p><p>{operation.message || operation.error}</p>{operation.total_items != null && <p>{number(operation.processed_items ?? 0)} / {number(operation.total_items)} records</p>}</li>)}</ul>
        {model.moreOperations && <Button variant="secondary" fullWidth={false} disabled={model.loadingOperations} onClick={model.loadMoreOperations}>Load more operations</Button>}
      </Card>
      <Card className="space-y-4 p-5">
        <div>
          <h2 className="font-semibold">Upload XLSX</h2>
          <p
            id="catalog-file-help"
            className="mt-1 text-sm text-[var(--kma-muted)]"
          >
            Maximum 3 MiB, 32 MiB uncompressed and 10,000 items; validation does
            not change the active catalog.
          </p>
        </div>
        <div>
          <Label htmlFor="catalog-file">XLSX file</Label>
          <Input
            id="catalog-file"
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            aria-describedby="catalog-file-help"
            disabled={
              !model.status?.enabled || model.busy || Boolean(model.pending)
            }
            onChange={(event) =>
              model.selectFile(event.target.files?.[0] ?? null)
            }
          />
        </div>
        <Button
          variant="secondary"
          fullWidth={false}
          disabled={!model.file || !model.canChange}
          isLoading={model.validating}
          onClick={() => void model.validate()}
        >
          Validate file
        </Button>
      </Card>
      {preview && (
        <Card className="space-y-4 p-5">
          <div>
            <h2 className="font-semibold">Validation preview</h2>
            <p className="mt-1 break-all text-sm text-[var(--kma-muted)]">
              {preview.file_name} · SHA-256 {preview.sha256}
            </p>
          </div>
          <div className="flex flex-wrap gap-4 text-sm font-medium">
            <span>{number(preview.item_count)} items</span>
            <span>{number(preview.flow_count)} flows</span>
            <span>{number(preview.duplicate_count)} duplicates</span>
          </div>
          {preview.warnings.length > 0 && (
            <div>
              <h3 className="text-sm font-medium">Warnings</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-[var(--kma-muted)]">
                {preview.warnings.slice(0, 20).map((warning, index) => (
                  <li key={index}>{warning}</li>
                ))}
              </ul>
              {preview.warnings.length > 20 && (
                <p className="mt-2 text-sm text-[var(--kma-muted)]">
                  {preview.warnings.length - 20} additional warnings; review the
                  source file before replacing.
                </p>
              )}
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-left text-sm">
              <caption className="mb-2 text-left text-xs text-[var(--kma-muted)]">
                Sample of up to 20 items
              </caption>
              <thead className="border-b border-[var(--kma-border)] text-[var(--kma-muted)]">
                <tr>
                  {["Flow", "Barrier", "Code", "Question", "Cost", "Unit"].map(
                    (label) => (
                      <th
                        key={label}
                        scope="col"
                        className="px-2 py-3 font-medium"
                      >
                        {label}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {preview.sample.slice(0, 20).map((item, index) => (
                  <tr
                    key={index}
                    className="border-b border-[var(--kma-border)]"
                  >
                    <td className="px-2 py-3">{item.flow_code}</td>
                    <td className="px-2 py-3">{item.barrier_id}</td>
                    <td className="px-2 py-3">{item.question_code}</td>
                    <td className="px-2 py-3">{item.question}</td>
                    <td className="px-2 py-3">{number(item.cost)}</td>
                    <td className="px-2 py-3">{item.unit ?? "Unknown"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-sm text-[var(--kma-muted)]">
            Replacing changes the entire active catalog for this environment;
            historical audits and reports keep their existing data.
          </p>
          <Button
            fullWidth={false}
            variant="destructive"
            disabled={!model.canChange}
            onClick={model.requestReplace}
          >
            Replace catalog
          </Button>
        </Card>
      )}
      <Card className="space-y-4 p-5">
        <div>
          <h2 className="font-semibold">Version history</h2>
          <p className="mt-1 text-sm text-[var(--kma-muted)]">
            Restore a complete version; every activation creates a new revision.
          </p>
        </div>
        {!model.loading && model.history.length === 0 && (
          <p className="text-sm text-[var(--kma-muted)]">No saved versions.</p>
        )}
        <ul className="divide-y divide-[var(--kma-border)]">
          {model.history.map((version) => (
            <li
              key={version.version}
              className="flex flex-wrap items-center justify-between gap-4 py-4"
            >
              <div className="min-w-0 space-y-1 text-sm">
                <p className="break-all font-medium">
                  {version.file_name}
                  {version.active ? " · Active" : ""}
                </p>
                <p className="break-all text-xs text-[var(--kma-muted)]">
                  Version {version.version} · {number(version.item_count)} items
                  · {number(version.flow_count)} flows
                </p>
                <p className="text-xs text-[var(--kma-muted)]">
                  Uploaded {version.uploaded_at ?? "Unknown"} by{" "}
                  {version.uploaded_by ?? "Unknown"}
                </p>
              </div>
              <Button
                variant="secondary"
                fullWidth={false}
                disabled={version.active || !model.canChange}
                aria-label={`Restore ${version.file_name}`}
                onClick={() => model.requestRestore(version)}
              >
                Restore
              </Button>
            </li>
          ))}
        </ul>
        {model.hasMore && (
          <Button
            variant="secondary"
            fullWidth={false}
            disabled={model.loadingMore || model.busy}
            isLoading={model.loadingMore}
            onClick={model.loadMore}
          >
            Load more versions
          </Button>
        )}
      </Card>
      <ConfirmDialog
        open={model.retryConfirmation}
        onOpenChange={open => { if (!open) model.cancelRetry(); }}
        title="Retry the same catalog operation?"
        description={`Retry operation ${model.pending?.id ?? ""} using its original request and revision ${model.pending?.expected_revision ?? ""}? No new operation will be created.`}
        confirmLabel="Retry same operation"
        loading={model.busy}
        onConfirm={model.confirmRetry}
      />
      <ConfirmDialog
        open={Boolean(model.confirmation)}
        onOpenChange={(open) => {
          if (!open) model.cancelConfirmation();
        }}
        title={
          model.confirmation?.kind === "activate"
            ? "Restore catalog version?"
            : "Replace catalog?"
        }
        description={
          model.confirmation?.kind === "activate"
            ? `Restore “${model.confirmation.version.file_name}” as the complete active catalog for this environment?`
            : `Replace the entire active catalog with “${preview?.file_name ?? "the validated file"}”? Historical audits and reports will remain unchanged.`
        }
        confirmLabel={
          model.confirmation?.kind === "activate"
            ? "Restore version"
            : "Replace catalog"
        }
        loading={model.busy}
        onConfirm={model.confirm}
      />
    </div>
  );
}
