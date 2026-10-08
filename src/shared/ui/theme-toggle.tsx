"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { SunMoon } from "lucide-react";
import { cn } from "@shared/lib/cn";

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <label className={cn("kma-appearance inline-flex items-center gap-2 rounded border border-[var(--kma-border)] bg-[var(--kma-surface)] min-h-11 sm:min-h-10 px-2.5 py-1.5 text-[var(--kma-muted)]", className)}>
      <SunMoon className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span className="sr-only">Appearance</span>
      <select aria-label="Appearance" value={mounted ? theme : "system"} onChange={(event) => setTheme(event.target.value)} className="!border-0 !bg-transparent !p-0 text-xs font-medium !shadow-none">
        <option value="light">Light</option>
        <option value="dark">Dark</option>
        <option value="system">System</option>
      </select>
    </label>
  );
}
