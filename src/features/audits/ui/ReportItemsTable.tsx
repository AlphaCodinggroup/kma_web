"use client";

import React, { useCallback, useMemo, useState } from "react";
import { cn } from "@shared/lib/cn";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@shared/ui/table";
import { Eye, EyeOff, Image as ImageIcon, MessageSquare } from "lucide-react";
import RowActionButton from "@shared/ui/row-action-button";
import type { AuditFinding } from "@entities/audit/model/audit-review";
import { Button } from "@shared/ui/controls";

export interface ReportItemsTableProps {
  items: AuditFinding[];
  // onAddComment?: (row: ReportBarrierRowVM) => void;
  className?: string;
  loading?: boolean;
  error?: boolean;
  onError?: () => void;
}

type PhotoInput =
  | string
  | { url?: string; include_in_report?: boolean }
  | null
  | undefined;

function extractPhotoUrls(photos: PhotoInput[]): string[] {
  if (!Array.isArray(photos)) return [];
  // Si ya es string[], validamos URLs
  if (photos.length > 0 && typeof photos[0] === "string") {
    return (photos as string[]).filter(
      (u) => typeof u === "string" && /^https?:\/\//.test(u)
    );
  }
  // Caso objetos { url }
  return (photos as Array<{ url?: string }>)
    .map((p) => (typeof p?.url === "string" ? p.url : ""))
    .filter((u) => /^https?:\/\//.test(u));
}

/** Fotos grandes apiladas verticalmente con toggle mostrar/ocultar por imagen */
function PhotosColumn({ photos }: { photos: PhotoInput[] }) {
  const [hidden, setHidden] = useState<Set<number>>(new Set());
  const toggle = useCallback((i: number) => {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }, []);

  const srcs = useMemo<string[]>(() => extractPhotoUrls(photos), [photos]);

  if (!srcs.length) {
    return (
      <div className="relative h-[160px] w-[260px] overflow-hidden rounded-xl border bg-muted/30">
        <div className="flex h-full items-center justify-center">
          <ImageIcon className="h-6 w-6 opacity-60" aria-hidden="true" />
        </div>
      </div>
    );
  }

  const stack = srcs.slice(0, 3);
  return (
    <div className="flex w-[260px] flex-col items-stretch gap-3">
      {stack.map((src, i) => {
        const isHidden = hidden.has(i);
        return (
          <div
            key={src + i}
            className="relative h-[160px] w-full overflow-hidden rounded-xl border border-gray-300 shadow-sm"
          >
            {/* Botón ojo (derecha) */}
            <button
              type="button"
              onClick={() => toggle(i)}
              aria-label={isHidden ? "Mostrar imagen" : "Ocultar imagen"}
              className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-card/80 backdrop-blur ring-1 ring-border hover:bg-card"
            >
              {isHidden ? (
                <Eye className="h-4 w-4" aria-hidden="true" />
              ) : (
                <EyeOff className="h-4 w-4" aria-hidden="true" />
              )}
            </button>

            {/* Contenido de la tarjeta: imagen o placeholder */}
            {isHidden ? (
              <div className="flex h-full w-full items-center justify-center bg-muted/40">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Eye className="h-4 w-4" aria-hidden="true" />
                  <span>Imagen oculta</span>
                </div>
              </div>
            ) : (
              <img
                src={src}
                alt={`photo-${i + 1}`}
                loading="lazy"
                className="h-full w-full object-cover"
              />
            )}
          </div>
        );
      })}
      {srcs.length > 3 && (
        <span className="text-xs text-muted-foreground">
          +{srcs.length - 3} more
        </span>
      )}
    </div>
  );
}

const ReportItemsTable: React.FC<ReportItemsTableProps> = ({
  items,
  // onAddComment,
  className,
  loading = false,
  error = false,
  onError,
}) => {
  const rows = useMemo<AuditFinding[]>(() => items, [items]);

  const grandTotal = useMemo<number>(
    () =>
      rows.reduce(
        (acc, r) =>
          acc +
          (typeof r.calculatedCost === "number" &&
            Number.isFinite(r.calculatedCost)
            ? r.calculatedCost
            : 0),
        0
      ),
    [rows]
  );

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-muted/40 backdrop-blur-sm z-50">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mb-3 flex items-center justify-between rounded-md border border-red-200 bg-red-50 px-3 py-2 text-2xl text-red-700">
        <span>Failed to load audits. Please try again.</span>
        <Button onClick={onError}>Retry</Button>
      </div>
    );
  }

  return (
    <div
      className={cn("rounded-2xl border border-gray-200 bg-card/50", className)}
    >
      {/* Scroll horizontal si hace falta */}
      <div className="w-full overflow-x-auto">
        <Table className="min-w-[1200px]">
          <TableHeader>
            <TableRow className="rounded-2xl">
              <TableHead className="rounded-tl-2xl">#</TableHead>
              <TableHead>Barrier Statement</TableHead>
              <TableHead>Code References</TableHead>
              <TableHead>Photo</TableHead>
              <TableHead>Proposed Mitigation</TableHead>
              <TableHead className="text-center">Cost</TableHead>
              <TableHead className="rounded-tr-2xl">Actions</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="py-10 text-center text-sm text-muted-foreground"
                >
                  No report items available.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r, idx) => (
                <TableRow key={idx + 1} className="align-top">
                  {/* # */}
                  <TableCell className="font-medium">{idx + 1}.</TableCell>

                  {/* Barrier Statement */}
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <div className="font-semibold leading-snug">
                        {r.barrierStatement}
                      </div>
                      <div className="break-words text-xs text-muted-foreground">
                        Item ID:{" "}
                        <span className="font-mono">
                          {r.questionCode ?? ""}
                        </span>
                      </div>
                    </div>
                  </TableCell>

                  {/* Code References */}
                  <TableCell>
                    {typeof r.adasReference === "string" &&
                      r.adasReference.trim() ? (
                      <ul className="list-inside list-disc space-y-1 text-sm">
                        <li>{r.adasReference.trim()}</li>
                      </ul>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </TableCell>

                  {/* Photos */}
                  <TableCell>
                    <PhotosColumn
                      photos={Array.isArray(r.photos) ? r.photos : []}
                    />
                  </TableCell>

                  {/* Proposed Mitigation */}
                  <TableCell>
                    <p className="text-sm leading-relaxed">
                      {r.proposedMitigation ?? "—"}
                    </p>
                  </TableCell>

                  {/* Cost */}
                  <TableCell className="text-left font-semibold">
                    {typeof r.calculatedCost === "number" &&
                      Number.isFinite(r.calculatedCost)
                      ? r.calculatedCost
                      : "—"}
                  </TableCell>

                  {/* Actions */}
                  <TableCell className="text-left">
                    <RowActionButton
                      icon={MessageSquare}
                      ariaLabel="Delete project"
                      onClick={undefined}
                      size="md"
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Footer */}
      {rows.length > 0 && (
        <div className="flex items-center justify-end gap-8 px-3 py-4 text-sm">
          <div className="text-muted-foreground">
            Showing <span className="font-medium">{rows.length}</span> items
          </div>
          <div className="font-semibold">Grand Total: {grandTotal}</div>
        </div>
      )}
    </div>
  );
};

export default ReportItemsTable;
