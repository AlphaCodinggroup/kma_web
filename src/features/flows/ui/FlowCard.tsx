"use client";

import * as React from "react";
import { Eye, Pencil, Loader2, Trash2, Workflow } from "lucide-react";
import { cn } from "@shared/lib/cn";
import { Button } from "@shared/ui/controls";
import Link from "next/link";
import type { Route } from "next";
import ConfirmDialog from "@shared/ui/confirm-dialog";
import { useSession } from "@processes/auth/hooks";

export interface FlowCardProps {
  title: string;
  description?: string;
  code?: string | undefined;
  className?: string;
  onViewQuestions?: () => void;
  "data-testid"?: string;
  flowId: string;
  onDeleted?: () => void;
}

export const FlowCard: React.FC<FlowCardProps> = ({
  title,
  description,
  code,
  className,
  onViewQuestions,
  "data-testid": dataTestId,
  flowId,
  onDeleted,
}) => {
  const [isNavigating, setIsNavigating] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const { isAdmin } = useSession();
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [deleteError, setDeleteError] = React.useState<string | null>(null);

  const handleDelete = async () => {
    if (isDeleting || !isAdmin) return;
    setDeleteError(null);
    setIsDeleting(true);
    try {
      const { flowsRepo } = await import("@features/flows/api/flows.repo.impl");
      await flowsRepo.delete(flowId);
      setIsDeleting(false);
      setConfirmDelete(false);
      if (onDeleted) onDeleted();
      else window.location.reload(); // Fallback
    } catch (error) {
      console.error("Failed to delete flow", error);
      setDeleteError(error instanceof Error ? error.message : "Failed to delete flow. Try again.");
      setIsDeleting(false);
    }
  };

  return (
    <>
    <article data-testid={dataTestId} className={cn("grid gap-4 bg-[var(--kma-surface)] px-4 py-5 transition-colors hover:bg-[var(--kma-subtle)] sm:items-center sm:px-6 xl:grid-cols-[minmax(0,1fr)_14rem]", className)} aria-busy={isNavigating || isDeleting}>
      <div className="flex min-w-0 flex-1 items-start gap-3.5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-[var(--kma-brand)] text-[var(--kma-brand-fg)]"><Workflow className="h-5 w-5" aria-hidden="true" /></div>
        <div className="min-w-0">
          <h3 className="break-words text-base font-semibold leading-6 text-[var(--kma-fg)]">{title}</h3>
          {code ? <p className="mt-1 text-xs font-medium tracking-wide text-[var(--kma-muted)]">{code}</p> : null}
          {description ? <p className="mt-1 max-w-2xl break-words text-sm leading-5 text-[var(--kma-muted)]">{description}</p> : null}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2 xl:justify-end">
        <Button type="button" variant="ghost" fullWidth={false} onClick={onViewQuestions} disabled={isNavigating || isDeleting}>
          <Eye className="h-4 w-4" aria-hidden="true" /><span>View Questions</span>
        </Button>
        {isAdmin ? (
          <Link href={`/flows/${encodeURIComponent(flowId)}` as Route} aria-label="Edit flow" aria-disabled={isDeleting || isNavigating} onClick={(event) => { if (isDeleting || isNavigating) event.preventDefault(); else setIsNavigating(true); }} className="inline-flex h-11 w-11 items-center justify-center rounded text-[var(--kma-muted)] transition-colors hover:bg-[var(--kma-subtle)] hover:text-[var(--kma-fg)]">
            {isNavigating ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Pencil className="h-4 w-4" aria-hidden="true" />}
          </Link>
        ) : (
          <div className="inline-flex h-11 w-11 items-center justify-center text-[var(--kma-muted)] opacity-50 cursor-not-allowed" title="Only administrators can edit flows"><Pencil className="h-4 w-4" aria-hidden="true" /></div>
        )}
        <button type="button" onClick={() => { setDeleteError(null); setConfirmDelete(true); }} disabled={isDeleting || isNavigating || !isAdmin} aria-label="Delete flow" className="inline-flex h-11 w-11 items-center justify-center rounded text-[var(--kma-muted)] transition-colors hover:bg-[color-mix(in_srgb,var(--kma-danger)_10%,transparent)] hover:text-[var(--kma-danger)] disabled:opacity-50 disabled:cursor-not-allowed" title={!isAdmin ? "Only administrators can delete flows" : "Delete flow"}>
          {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" aria-hidden="true" />}
        </button>
      </div>
      {isNavigating ? <span role="status" className="sr-only">Navigating to flow...</span> : null}
    </article>
    <ConfirmDialog open={confirmDelete} onOpenChange={setConfirmDelete} title={`Delete ${title}?`} description="This action cannot be undone." confirmLabel="Delete" onConfirm={handleDelete} loading={isDeleting} error={deleteError} />
    </>
  );
};

export default FlowCard;
