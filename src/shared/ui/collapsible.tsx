"use client";

import React, { useId, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@shared/lib/cn";

export interface CollapsibleProps {
  /** Encabezado siempre visible; va dentro del botón, así que sólo contenido en línea. */
  title: React.ReactNode;
  /** Resumen a la derecha del encabezado. */
  meta?: React.ReactNode;
  defaultOpen?: boolean | undefined;
  className?: string | undefined;
  children: React.ReactNode;
}

/**
 * Sección desplegable. El contenido se monta sólo mientras está abierta, así
 * las consultas de los hijos no se disparan con la sección cerrada.
 */
export function Collapsible({
  title,
  meta,
  defaultOpen = false,
  className,
  children,
}: CollapsibleProps) {
  const [open, setOpen] = useState(defaultOpen);
  const contentId = useId();

  return (
    <section
      className={cn("rounded-xl border border-[var(--kma-border)] bg-[var(--kma-surface)]", className)}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-controls={contentId}
        onClick={() => setOpen((value) => !value)}
        className="grid w-full grid-cols-[16px_minmax(0,1fr)] items-start gap-x-3 gap-y-1 rounded-xl px-4 py-3 text-left transition-colors hover:bg-[var(--kma-subtle)] md:flex md:items-center"
      >
        <ChevronDown
          aria-hidden="true"
          className={cn(
            "h-4 w-4 shrink-0 text-[var(--kma-muted)] transition-transform",
            open ? "" : "-rotate-90"
          )}
        />
        <span className="min-w-0 flex-1 [overflow-wrap:anywhere]">{title}</span>
        {meta ? (
          <span className="col-start-2 min-w-0 break-words text-sm text-[var(--kma-muted)] md:shrink-0">{meta}</span>
        ) : null}
      </button>
      <div
        id={contentId}
        hidden={!open}
        className="border-t border-[var(--kma-border)] "
      >
        {open ? children : null}
      </div>
    </section>
  );
}

export default Collapsible;
