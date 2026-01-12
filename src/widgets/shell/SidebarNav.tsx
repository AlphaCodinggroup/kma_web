"use client";

import React, { useCallback, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  GitBranch,
  FolderClosed,
  Users,
  LogOut,
  Loader2 as LoadingSpinner,
} from "lucide-react";
import type { Route } from "next";
import type { Role } from "@entities/user/model/sessions";
import { logout } from "@features/auth/lib/usecases/login";

import { Loading } from "@shared/ui/Loading";

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
  { label: "Projects & Facilities", href: "/projects" as Route, icon: FolderClosed },
  { label: "User Management", href: "/users" as Route, icon: Users },
];

type SidebarNavProps = {
  items?: NavItem[];
  widthClassName?: string;
  role?: Role | undefined;
};

const SidebarNav: React.FC<SidebarNavProps> = ({
  items = DEFAULT_NAV,
  widthClassName = "w-65",
  role,
}) => {
  const pathname = usePathname();
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [navigatingTo, setNavigatingTo] = useState<string | null>(null);

  React.useEffect(() => {
    setNavigatingTo(null);
  }, [pathname]);

  const isActive = useCallback(
    (href: string) => {
      if (!pathname) return false;
      // Activo si coincide exacto o si es prefijo (para subrutas de la sección)
      return pathname === href || pathname.startsWith(`${href}/`);
    },
    [pathname]
  );

  const canAccess = useCallback(
    (item: NavItem) => {
      if (item.href === ("/users" as Route)) {
        const normalized = role?.toLowerCase();
        return normalized === "administrator" || normalized === "admin";
      }
      return true;
    },
    [role]
  );

  const handleLogout = useCallback(async () => {
    try {
      setIsSigningOut(true);
      await logout();
      router.push("/login");
      router.refresh();
    } catch (err) {
      console.error("[SidebarNav] logout failed", err);
    } finally {
      setIsSigningOut(false);
    }
  }, [router]);

  return (
    <aside
      className={[
        "hidden md:flex shrink-0 h-full border-r border-gray-200 bg-white",
        widthClassName,
      ].join(" ")}
      aria-label="Primary"
    >
      <div className="flex h-full w-full flex-col">
        <>
          <nav className="w-full flex-1 p-4">
            <ul className="space-y-2">
              {items
                .filter((it) => !it.hidden)
                .filter((it) => canAccess(it))
                .map((it) => {
                  const active = isActive(it.href);
                  const isNavigatingThis = navigatingTo === it.href;
                  const Icon = it.icon;
                  return (
                    <li key={it.href}>
                      <Link
                        href={it.href}
                        prefetch={true}
                        onMouseEnter={() => router.prefetch(it.href)}
                        onClick={() => {
                          if (pathname !== it.href) {
                            setNavigatingTo(it.href);
                          }
                        }}
                        className={[
                          "flex items-center gap-4 rounded-md px-3 py-2 text-sm transition-colors font-bold",
                          active
                            ? "bg-black text-white shadow-sm"
                            : "text-gray-700 hover:bg-gray-100",
                          isNavigatingThis || (navigatingTo && !isNavigatingThis) ? "pointer-events-none opacity-80" : ""
                        ].join(" ")}
                        aria-current={active ? "page" : undefined}
                      >
                        {isNavigatingThis ? (
                          <LoadingSpinner className="h-4 w-4 animate-spin" />
                        ) : (
                          <Icon className="h-4 w-4" aria-hidden="true" />
                        )}
                        <span className="truncate">{it.label}</span>
                      </Link>
                    </li>
                  );
                })
              }
            </ul>
          </nav>

          <div className="border-t border-gray-200 p-4">
            <button
              type="button"
              onClick={handleLogout}
              disabled={isSigningOut}
              className={[
                "w-full flex items-center gap-4 rounded-md px-3 py-2 text-sm font-bold transition-colors",
                "text-gray-700 hover:bg-gray-100 disabled:opacity-60 disabled:cursor-not-allowed",
              ].join(" ")}
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              <span className="truncate">Logout</span>
            </button>
          </div>
        </>
      </div>
    </aside>
  );
};

export default SidebarNav;
