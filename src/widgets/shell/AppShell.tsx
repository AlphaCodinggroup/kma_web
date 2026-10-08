"use client";

import React, { useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { Role } from "@entities/user/model/sessions";
import AppHeader from "./AppHeader";
import SidebarNav from "./SidebarNav";

const SECTIONS: Record<string, string> = {
  dashboard: "Dashboard", projects: "Projects", audits: "Audits", reports: "Reports", flows: "Flows", users: "User management",
};

type AppShellProps = {
  children: React.ReactNode;
  role?: Role | undefined;
  userName?: string | undefined;
};

export default function AppShell({ children, role, userName }: AppShellProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const section = pathname?.split("/")[1] ?? "dashboard";
  const title = section === "projects" && searchParams?.get("tab") === "facilities" ? "Facilities" : SECTIONS[section] ?? "Workspace";

  return (
    <Dialog.Root open={menuOpen} onOpenChange={setMenuOpen}>
      <div className="min-h-dvh bg-[var(--kma-nav)] text-[var(--kma-fg)]">
        <a href="#workspace-content" className="sr-only fixed left-4 top-2 z-50 rounded bg-[var(--kma-surface)] p-3 focus:not-sr-only">Skip to content</a>
        <AppHeader title={title} role={role} userName={userName} menuOpen={menuOpen} onMenuOpen={() => setMenuOpen(true)} />
        <div className="flex h-[calc(100dvh-64px)] min-h-0">
          <SidebarNav role={role} />
          <main id="workspace-content" className="min-w-0 flex-1 overflow-y-auto border-[var(--kma-border)] bg-[var(--kma-canvas)] lg:border-l" tabIndex={-1}>
            <div className="mx-auto max-w-[1440px] px-4 py-6 md:px-6 lg:px-8 lg:py-8">{children}</div>
          </main>
        </div>
      </div>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-[var(--kma-overlay)]" />
        <Dialog.Content className="fixed inset-y-0 left-0 z-50 flex w-[min(320px,calc(100vw-40px))] kma-theme-panel flex-col bg-[var(--kma-nav)] shadow-2xl">
          <div className="flex h-16 shrink-0 items-center justify-between border-b border-[var(--kma-border)] px-5">
            <Dialog.Title className="text-lg font-bold text-[var(--kma-fg)]">Navigation</Dialog.Title>
            <Dialog.Close aria-label="Close navigation" className="flex h-11 w-11 items-center justify-center rounded text-[var(--kma-muted)] hover:bg-[var(--kma-input)]"><X className="h-5 w-5" aria-hidden="true" /></Dialog.Close>
          </div>
          <Dialog.Description className="sr-only">Navigate your KMA audit workspace.</Dialog.Description>
          <div className="min-h-0 flex-1"><SidebarNav mobile role={role} onNavigate={() => setMenuOpen(false)} /></div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
