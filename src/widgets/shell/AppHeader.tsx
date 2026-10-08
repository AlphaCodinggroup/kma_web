"use client";

import React from "react";
import { ChevronRight, Menu } from "lucide-react";
import type { Role } from "@entities/user/model/sessions";
import { ThemeToggle } from "@shared/ui/theme-toggle";
import * as Dialog from "@radix-ui/react-dialog";
import { BrandMark } from "@shared/ui/brand-mark";

type AppHeaderProps = {
  title?: string;
  role?: Role | undefined;
  userName?: string | undefined;
  onMenuOpen?: () => void;
  menuOpen?: boolean;
};

const AppHeader: React.FC<AppHeaderProps> = ({ title = "Workspace", role, userName, onMenuOpen, menuOpen = false }) => (
  <header className="sticky top-0 z-40 flex h-16 border-b border-[var(--kma-border)] bg-[var(--kma-surface)]">
    <div className="flex min-w-0 items-center gap-2 pl-2 pr-3 lg:w-[248px] lg:shrink-0 lg:border-r lg:border-[var(--kma-brand-border)] lg:bg-[var(--kma-brand)] lg:px-6 lg:text-[var(--kma-brand-fg)]">
      {onMenuOpen && <Dialog.Trigger asChild><button type="button" onClick={onMenuOpen} aria-label="Open navigation" aria-expanded={menuOpen} aria-haspopup="dialog" className="flex h-11 w-11 shrink-0 items-center justify-center rounded text-[var(--kma-fg)] hover:bg-[var(--kma-subtle)] lg:hidden"><Menu className="h-5 w-5" aria-hidden="true" /></button></Dialog.Trigger>}
      <BrandMark />
    </div>
    <div className="flex min-w-0 flex-1 items-center justify-end gap-3 pr-4 md:justify-between md:pl-6 lg:px-8">
      <div className="hidden min-w-0 items-center gap-2 text-sm text-[var(--kma-muted)] md:flex" aria-label="Current location">{title !== "Workspace" && <><span>Workspace</span><ChevronRight className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /></>}<span className="truncate font-semibold text-[var(--kma-fg)]">{title}</span></div>
      <div className="flex shrink-0 items-center gap-2 md:gap-4">
        <ThemeToggle />
        <div className="border-l border-[var(--kma-border)] pl-3 text-right">
          {userName && <p className="hidden max-w-40 truncate text-[13px] font-semibold text-[var(--kma-fg)] sm:block">{userName}</p>}
          <span className="text-xs capitalize text-[var(--kma-muted)]">{role ?? "Guest"}</span>
        </div>
      </div>
    </div>
  </header>
);

export default AppHeader;
