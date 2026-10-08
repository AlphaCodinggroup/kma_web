import { useId } from "react";
import { cn } from "@shared/lib/cn";

/** Logo de KMA: círculo rojo con las letras en blanco; el mismo trazo vive en public/brand/kma-logo.svg. */
export function BrandMark({ className }: { className?: string }) {
  // Un id por instancia: un SVG oculto con display:none no resuelve el clipPath de otro.
  const clipId = `${useId()}-kma-cap`;
  return (
    <svg viewBox="0 0 100 100" role="img" aria-label="KMA" className={cn("h-10 w-10 shrink-0", className)}>
      <defs><clipPath id={clipId}><rect x="200" y="303" width="430" height="127" /></clipPath></defs>
      <circle cx="50" cy="50" r="50" fill="var(--ks-brand-red)" />
      <g transform="translate(50 50) scale(0.18727) translate(-413 -366.5)" fill="none" stroke="var(--ks-on-brand)" strokeLinejoin="miter" clipPath={`url(#${clipId})`}>
        <path d="M230 290V440" strokeWidth="30" />
        <path d="M240 374L330 290" strokeWidth="36" />
        <path d="M280 345L333 440" strokeWidth="33" />
        <path d="M360 290V440M466 290V440" strokeWidth="28" />
        <path d="M360 296L413 392L466 296" strokeWidth="28" />
        <path d="M496 440L551 296L606 440" strokeWidth="31" />
        <path d="M517 405H585" strokeWidth="22" />
      </g>
    </svg>
  );
}
