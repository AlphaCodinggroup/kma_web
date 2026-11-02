import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";

type MobileEntityRowProps = {
  title: ReactNode;
  subtitle?: ReactNode;
  status?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
};

/** Fila adaptable: identidad y acciones siempre visibles, detalles bajo demanda. */
export function MobileEntityRow({ title, subtitle, status, actions, children }: MobileEntityRowProps) {
  return (
    <li className="min-w-0 px-4 py-4">
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
        <div className="min-w-0 flex-1 basis-40 break-words text-[15px] font-semibold text-[var(--kma-fg)] [overflow-wrap:anywhere]">{title}</div>
        {status && <div className="shrink-0">{status}</div>}
      </div>
      {subtitle && <div className="mt-1 break-words text-sm text-[var(--kma-muted)] [overflow-wrap:anywhere]">{subtitle}</div>}
      {actions && <div className="mt-3 flex flex-wrap items-center gap-2" aria-label="Actions">{actions}</div>}
      {children && (
        <details className="group mt-3 border-t border-[var(--kma-border)] pt-2">
          <summary className="flex min-h-11 list-none items-center gap-1.5 text-sm font-medium text-[var(--kma-muted)] [&::-webkit-details-marker]:hidden">Details<ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" aria-hidden="true" /></summary>
          <div className="pb-1 pt-2 text-sm text-[var(--kma-muted)]">{children}</div>
        </details>
      )}
    </li>
  );
}
