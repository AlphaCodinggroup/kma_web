"use client";

import React, { useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  GitBranch,
  FolderClosed,
  Building2,
  Users,
} from "lucide-react";
import type { Route } from "next";

export type NavItem = {
  label: string;
  href: Route;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  /** Si en el futuro querés ocultar por rol/permiso */
  hidden?: boolean;
};

const DEFAULT_NAV: NavItem[] = [
  { label: "Dashboard", href: "/dashboard" as Route, icon: LayoutDashboard },
  { label: "Audits", href: "/audits" as Route, icon: FileText },
  { label: "Reports", href: "/reports" as Route, icon: FileText },
  { label: "Flows", href: "/flows" as Route, icon: GitBranch },
  { label: "Projects", href: "/projects" as Route, icon: FolderClosed },
  { label: "Buildings", href: "/buildings" as Route, icon: Building2 },
  { label: "User Management", href: "/users" as Route, icon: Users },
];

type SidebarNavProps = {
  items?: NavItem[];
  widthClassName?: string;
};

const SidebarNav: React.FC<SidebarNavProps> = ({
  items = DEFAULT_NAV,
  widthClassName = "w-65",
}) => {
  const pathname = usePathname();

  const isActive = useCallback(
    (href: string) => {
      if (!pathname) return false;
      // Activo si coincide exacto o si es prefijo (para subrutas de la sección)
      return pathname === href || pathname.startsWith(`${href}/`);
    },
    [pathname]
  );

  return (
    <aside
      className={[
        "hidden md:flex shrink-0 h-full border-r border-gray-200 bg-white",
        widthClassName,
      ].join(" ")}
      aria-label="Primary"
    >
      <nav className="w-full p-4">
        <ul className="space-y-2">
          {items
            .filter((it) => !it.hidden)
            .map((it) => {
              const active = isActive(it.href);
              const Icon = it.icon;
              return (
                <li key={it.href}>
                  <Link
                    href={it.href}
                    className={[
                      "flex items-center gap-4 rounded-md px-3 py-2 text-sm transition-colors font-bold",
                      active
                        ? "bg-black text-white shadow-sm"
                        : "text-gray-700 hover:bg-gray-100",
                    ].join(" ")}
                    aria-current={active ? "page" : undefined}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    <span className="truncate">{it.label}</span>
                  </Link>
                </li>
              );
            })}
        </ul>
      </nav>
    </aside>
  );
};

export default SidebarNav;
