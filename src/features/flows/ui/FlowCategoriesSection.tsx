"use client";

import React from "react";
import type { FlowCategory } from "@entities/flow/model";
import { Badge } from "@shared/ui/badge";
import ConfirmDialog from "@shared/ui/confirm-dialog";
import { useSession } from "@processes/auth/hooks";
import { Loader2, Pencil, Tag, Trash2 } from "lucide-react";

export interface FlowCategoriesSectionProps {
  items: FlowCategory[];
  onEdit: (category: FlowCategory) => void;
  onDelete: (category: FlowCategory, permanent: boolean) => Promise<void>;
  className?: string | undefined;
  "data-testid"?: string | undefined;
}

export const FlowCategoriesSection: React.FC<FlowCategoriesSectionProps> = ({
  items,
  onEdit,
  onDelete,
  className,
  "data-testid": testId,
}) => {
  const { isAdmin } = useSession();
  const [confirmTarget, setConfirmTarget] = React.useState<FlowCategory | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [deleteError, setDeleteError] = React.useState<string | null>(null);

  const handleConfirmDelete = async () => {
    if (!confirmTarget || !isAdmin || isDeleting) return;
    setDeleteError(null);
    setIsDeleting(true);
    try {
      // Si ya está inactiva se elimina definitivamente; si está activa se desactiva.
      await onDelete(confirmTarget, !confirmTarget.isActive);
      setIsDeleting(false);
      setConfirmTarget(null);
    } catch (err) {
      setDeleteError(
        err instanceof Error ? err.message : "Failed to delete category. Try again."
      );
      setIsDeleting(false);
    }
  };

  return (
    <section className={className} data-testid={testId ?? "flow-categories-section"}>
      <div className="divide-y divide-[var(--kma-border)]">
        {items.map((cat) => (
          <article
            key={cat.id}
            data-testid={`flow-category-card-${cat.id}`}
            className="grid gap-4 bg-[var(--kma-surface)] px-4 py-5 transition-colors hover:bg-[var(--kma-subtle)] sm:items-center sm:px-6 xl:grid-cols-[minmax(0,1fr)_8rem]"
          >
            <div className="flex min-w-0 flex-1 items-start gap-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-[var(--kma-brand)] text-[var(--kma-brand-fg)]">
                <Tag className="h-5 w-5" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="break-words text-base font-semibold leading-6 text-[var(--kma-fg)]">
                    {cat.name}
                  </h3>
                  <Badge tone={cat.isActive ? "success" : "neutral"}>
                    {cat.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
                {cat.description ? (
                  <p className="mt-1 max-w-2xl break-words text-sm leading-5 text-[var(--kma-muted)]">
                    {cat.description}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2 xl:justify-end">
              <button
                type="button"
                onClick={() => onEdit(cat)}
                disabled={!isAdmin || isDeleting}
                aria-label={`Edit category ${cat.name}`}
                title={!isAdmin ? "Only administrators can edit categories" : "Edit category"}
                className="inline-flex h-11 w-11 items-center justify-center rounded text-[var(--kma-muted)] transition-colors hover:bg-[var(--kma-subtle)] hover:text-[var(--kma-fg)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Pencil className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setDeleteError(null);
                  setConfirmTarget(cat);
                }}
                disabled={!isAdmin || isDeleting}
                aria-label={
                  cat.isActive
                    ? `Deactivate category ${cat.name}`
                    : `Delete category ${cat.name}`
                }
                title={
                  !isAdmin
                    ? "Only administrators can delete categories"
                    : cat.isActive
                      ? "Deactivate category"
                      : "Delete category permanently"
                }
                className="inline-flex h-11 w-11 items-center justify-center rounded text-[var(--kma-muted)] transition-colors hover:bg-[color-mix(in_srgb,var(--kma-danger)_10%,transparent)] hover:text-[var(--kma-danger)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isDeleting && confirmTarget?.id === cat.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                )}
              </button>
            </div>
          </article>
        ))}
      </div>

      <ConfirmDialog
        open={confirmTarget !== null}
        onOpenChange={(open) => {
          if (!open && !isDeleting) {
            setConfirmTarget(null);
            setDeleteError(null);
          }
        }}
        title={
          confirmTarget?.isActive
            ? `Deactivate ${confirmTarget.name}?`
            : `Delete ${confirmTarget?.name ?? "category"} permanently?`
        }
        description={
          confirmTarget?.isActive
            ? "Inactive categories stay hidden when assigning flows, and you can reactivate them later."
            : "This action cannot be undone."
        }
        confirmLabel={confirmTarget?.isActive ? "Deactivate" : "Delete"}
        onConfirm={handleConfirmDelete}
        loading={isDeleting}
        error={deleteError}
      />
    </section>
  );
};

export default FlowCategoriesSection;
