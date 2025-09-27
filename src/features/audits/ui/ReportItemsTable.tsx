"use client";

import * as React from "react";
import { cn } from "@shared/lib/cn";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@shared/ui/table";
import { Image as ImageIcon, MessageSquare } from "lucide-react";
import type { ReportItemVM } from "./AuditEditContent";
import RowActionButton from "@shared/ui/row-action-button";
import { Button } from "@shared/ui/controls";

/** VM para la tabla */
export interface ReportBarrierRowVM {
  id: string;
  barrierStatement: string;
  codeReferences: string[];
  photos: string[];
  proposedMitigation: string;
  cost: number | null;
}

export interface ReportItemsTableProps {
  items: Array<ReportBarrierRowVM | ReportItemVM>;
  onAddComment?: (row: ReportBarrierRowVM) => void;
  formatCurrency?: (n: number) => string;
  className?: string;
}

/** Helpers */
const FALLBACK_PHOTOS = [
  "https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=1600&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1518779578993-ec3579fee39f?w=1600&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1529429612778-cf12a121e6d5?w=1600&auto=format&fit=crop&q=80",
];

function ensurePhotos(photos?: string[], seed = 0): string[] {
  if (photos?.length && photos.every((p) => /^https?:\/\//.test(p)))
    return photos;
  const count = (seed % 3) + 1;
  return FALLBACK_PHOTOS.slice(0, count);
}

function normalizeItem(
  it: ReportBarrierRowVM | ReportItemVM,
  idx: number
): ReportBarrierRowVM {
  const isNew =
    (it as ReportBarrierRowVM).barrierStatement !== undefined &&
    (it as ReportBarrierRowVM).proposedMitigation !== undefined;

  if (isNew) {
    const row = it as ReportBarrierRowVM;
    return {
      ...row,
      photos: ensurePhotos(row.photos, idx),
      codeReferences: row.codeReferences ?? [],
    };
  }

  const legacy = it as ReportItemVM;
  const qty = typeof legacy.quantity === "number" ? legacy.quantity : null;
  const unit = typeof legacy.unitPrice === "number" ? legacy.unitPrice : null;
  const cost = qty !== null && unit !== null ? qty * unit : null;

  return {
    id: legacy.id,
    barrierStatement: legacy.title,
    codeReferences: [],
    photos: ensurePhotos(legacy.photos, idx),
    proposedMitigation:
      "Auto-generated: Proposed mitigation not provided. You can edit this once the API is connected.",
    cost,
  };
}

/** Fotos grandes apiladas verticalmente */
function PhotosColumn({ photos }: { photos: string[] }) {
  if (!photos?.length) {
    return (
      <div className="relative h-[160px] w-[260px] overflow-hidden rounded-xl border bg-muted/30">
        <div className="flex h-full items-center justify-center">
          <ImageIcon className="h-6 w-6 opacity-60" aria-hidden="true" />
        </div>
      </div>
    );
  }

  const stack = photos.slice(0, 3);
  return (
    <div className="flex w-[260px] flex-col items-stretch gap-3">
      {stack.map((src, i) => (
        <div
          key={src + i}
          className="relative h-[160px] w-full overflow-hidden rounded-xl border border-gray-300 shadow-sm"
        >
          <img
            src={src}
            alt={`photo-${i + 1}`}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        </div>
      ))}
      {photos.length > 3 && (
        <span className="text-xs text-muted-foreground">
          +{photos.length - 3} more
        </span>
      )}
    </div>
  );
}

const ReportItemsTable: React.FC<ReportItemsTableProps> = ({
  items,
  onAddComment,
  formatCurrency,
  className,
}) => {
  const toCurrency = React.useMemo(() => {
    if (formatCurrency) return formatCurrency;
    try {
      const f = new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      });
      return (n: number) => f.format(n);
    } catch {
      return (n: number) => `$${n.toLocaleString()}`;
    }
  }, [formatCurrency]);

  const rows = React.useMemo(() => items.map(normalizeItem), [items]);
  const grandTotal = React.useMemo(
    () =>
      rows.reduce(
        (acc, r) => acc + (typeof r.cost === "number" ? r.cost : 0),
        0
      ),
    [rows]
  );

  return (
    <div
      className={cn("rounded-2xl border border-gray-200 bg-card/50", className)}
    >
      {/* Scroll horizontal si hace falta */}
      <div className="w-full overflow-x-auto">
        <Table className="min-w-[1200px]">
          <TableHeader>
            <TableRow>
              <TableHead>#</TableHead>
              <TableHead>Barrier Statement</TableHead>
              <TableHead>Code References</TableHead>
              <TableHead>Photo</TableHead>
              <TableHead>Proposed Mitigation</TableHead>
              <TableHead>Cost</TableHead>
              <TableHead>Actions</TableHead>
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
                <TableRow key={r.id ?? idx} className="align-top">
                  {/* # */}
                  <TableCell className="font-medium">{idx + 1}.</TableCell>

                  {/* Barrier Statement */}
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <div className="font-semibold leading-snug">
                        {r.barrierStatement}
                      </div>
                      <div className="break-words text-xs text-muted-foreground">
                        Item ID: <span className="font-mono">{r.id}</span>
                      </div>
                    </div>
                  </TableCell>

                  {/* Code References */}
                  <TableCell>
                    {r.codeReferences?.length ? (
                      <ul className="list-inside list-disc space-y-1 text-sm">
                        {r.codeReferences.map((c, i) => (
                          <li key={c + i}>{c}</li>
                        ))}
                      </ul>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </TableCell>

                  {/* Photos */}
                  <TableCell>
                    <PhotosColumn photos={r.photos} />
                  </TableCell>

                  {/* Proposed Mitigation */}
                  <TableCell>
                    <p className="text-sm leading-relaxed">
                      {r.proposedMitigation}
                    </p>
                  </TableCell>

                  {/* Cost */}
                  <TableCell className="text-right font-semibold">
                    {typeof r.cost === "number" ? toCurrency(r.cost) : "—"}
                  </TableCell>

                  {/* Actions */}
                  <TableCell className="text-right">
                    <RowActionButton
                      icon={MessageSquare}
                      ariaLabel="Delete project"
                      onClick={onAddComment ? () => onAddComment(r) : undefined}
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
          <div className="font-semibold">
            Grand Total: {toCurrency(grandTotal)}
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportItemsTable;
