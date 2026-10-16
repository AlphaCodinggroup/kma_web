"use client";

import React, { useCallback, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { LayoutDashboard, ClipboardCheck, FileText, GitBranch, FolderClosed, Building2, Users, LogOut, Loader2 } from "lucide-react";
import type { Route } from "next";
import type { Role } from "@entities/user/model/sessions";
import { logout } from "@features/auth/lib/usecases/login";

export type NavItem = {
  label: string;
  href: Route;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  hidden?: boolean;
  group?: "Workspace" | "Administration";
};

const DEFAULT_NAV: NavItem[] = [
  { label: "Dashboard", href: "/dashboard" as Route, icon: LayoutDashboard, group: "Workspace" },
  { label: "Projects", href: "/projects?tab=projects" as Route, icon: FolderClosed, group: "Workspace" },
  { label: "Facilities", href: "/projects?tab=facilities" as Route, icon: Building2, group: "Workspace" },
  { label: "Audits", href: "/audits" as Route, icon: ClipboardCheck, group: "Workspace" },
  { label: "Reports", href: "/reports" as Route, icon: FileText, group: "Workspace" },
  { label: "Flows", href: "/flows" as Route, icon: GitBranch, group: "Administration" },
  { label: "User Management", href: "/users" as Route, icon: Users, group: "Administration" },
];

type SidebarNavProps = {
  items?: NavItem[];
  widthClassName?: string;
  role?: Role | undefined;
  mobile?: boolean;
  onNavigate?: () => void;
};

const SidebarNav: React.FC<SidebarNavProps> = ({ items = DEFAULT_NAV, widthClassName = "w-[248px]", role, mobile = false, onNavigate }) => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const [navigatingTo, setNavigatingTo] = useState<string | null>(null);
  const currentTab = searchParams?.get("tab") ?? "projects";

  React.useEffect(() => { setNavigatingTo(null); }, [pathname, currentTab]);

  const isActive = useCallback((href: string) => {
    if (!pathname) return false;
    const [target, query] = href.split("?");
    if (pathname !== target && !pathname.startsWith(`${target}/`)) return false;
    if (query && pathname === "/projects") return new URLSearchParams(query).get("tab") === currentTab;
    if (query && pathname.startsWith("/projects/")) return new URLSearchParams(query).get("tab") === "projects";
    return true;
  }, [pathname, currentTab]);

  const normalizedRole = role?.toLowerCase();
  const visibleItems = items.filter((item) => !item.hidden && (item.href !== "/users" || normalizedRole === "admin" || normalizedRole === "administrator"));

  const handleLogout = useCallback(async () => {
    setLogoutError(null);
    try {
      setIsSigningOut(true);
      await logout();
      router.push("/login");
      router.refresh();
      onNavigate?.();
    } catch (err) {
      console.error("[SidebarNav] logout failed", err);
      setLogoutError("Could not log out. Please try again.");
    } finally { setIsSigningOut(false); }
  }, [router, onNavigate]);

  return (
    <aside className={`${mobile ? "flex w-full" : `hidden lg:flex ${widthClassName}`} kma-theme-panel h-full shrink-0 bg-[var(--kma-nav)]`} aria-label="Primary">
      <div className="flex h-full min-h-0 w-full flex-col">
        <div className="mx-6 border-b border-[var(--kma-border)] pb-5 pt-6">
          <p className="text-sm font-semibold text-[var(--kma-fg)]">Audit workspace</p>
          <p className="mt-1 text-xs text-[var(--kma-muted)]">Project and quality management</p>
        </div>
        <nav className="w-full flex-1 overflow-y-auto px-3 py-1" aria-label="Main navigation">
          <ul className="space-y-1">
            {visibleItems.map((item, index) => {
              const active = isActive(item.href);
              const pending = navigatingTo === item.href;
              const Icon = item.icon;
              const showGroup = item.group && (index === 0 || visibleItems[index - 1]?.group !== item.group);
              return (
                <li key={item.href}>
                  {showGroup && <p className="px-3 pb-2 pt-6 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--kma-muted)]">{item.group}</p>}
                  <Link href={item.href} prefetch onMouseEnter={() => router.prefetch(item.href)} onClick={() => {
                    if (!isActive(item.href)) setNavigatingTo(item.href);
                    onNavigate?.();
                  }} aria-current={active ? "page" : undefined} aria-busy={pending} className={`kma-nav-link flex min-h-11 items-center gap-3 rounded px-3 py-2.5 text-sm font-medium transition-colors ${active ? "bg-[var(--kma-selected)] font-semibold text-[var(--kma-primary)]" : "text-[var(--kma-muted)] hover:bg-[var(--kma-selected)] hover:text-[var(--kma-fg)]"} ${pending ? "opacity-80" : ""}`}>
                    {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />}
                    <span className="truncate">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="border-t border-[var(--kma-border)] p-3">
          {logoutError && <p role="alert" className="mb-2 px-3 text-xs text-[var(--kma-danger)]">{logoutError}</p>}
          <button type="button" onClick={handleLogout} disabled={isSigningOut} className="flex min-h-11 w-full items-center gap-3 rounded px-3 py-2 text-[13px] font-medium text-[var(--kma-muted)] transition-colors hover:bg-[var(--kma-selected)] disabled:cursor-not-allowed disabled:opacity-60">
            {isSigningOut ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <LogOut className="h-4 w-4" aria-hidden="true" />}
            <span>Logout</span>
          </button>
        </div>
      </div>
    </aside>
  );
};

export default SidebarNav;
