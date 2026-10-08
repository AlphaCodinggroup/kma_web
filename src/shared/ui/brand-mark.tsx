import { cn } from "@shared/lib/cn";

export function BrandMark({ className }: { className?: string }) {
  return <span className={cn("kma-wordmark", className)}>KMA<span aria-hidden="true" className="ml-1.5 inline-block h-1.5 w-1.5 bg-[var(--kma-accent)] align-baseline" /></span>;
}
