"use client";

import type { ReactElement, ReactNode } from "react";
import * as Primitive from "@radix-ui/react-tooltip";

export function Tooltip({ children, content }: { children: ReactElement; content: ReactNode }) {
  return (
    <Primitive.Provider delayDuration={300}>
      <Primitive.Root>
        <Primitive.Trigger asChild>{children}</Primitive.Trigger>
        <Primitive.Portal>
          <Primitive.Content sideOffset={6} className="z-[80] max-w-64 rounded bg-[var(--kma-fg)] px-3 py-2 text-xs leading-relaxed text-[var(--kma-surface)] shadow-[var(--kma-elevation-overlay)]">{content}<Primitive.Arrow className="fill-[var(--kma-fg)]" /></Primitive.Content>
        </Primitive.Portal>
      </Primitive.Root>
    </Primitive.Provider>
  );
}
