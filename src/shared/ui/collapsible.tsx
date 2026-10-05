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
      className={cn("rounded-xl border border-gray-200 bg-white", className)}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-controls={contentId}
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition-colors hover:bg-gray-50"
      >
        <ChevronDown
          aria-hidden="true"
          className={cn(
            "h-4 w-4 shrink-0 text-gray-500 transition-transform",
            open ? "" : "-rotate-90"
          )}
        />
        <span className="min-w-0 flex-1">{title}</span>
        {meta ? (
          <span className="shrink-0 text-sm text-gray-600">{meta}</span>
        ) : null}
      </button>
      <div
        id={contentId}
        hidden={!open}
        className="border-t border-gray-200"
      >
        {open ? children : null}
      </div>
    </section>
  );
}

export default Collapsible;
