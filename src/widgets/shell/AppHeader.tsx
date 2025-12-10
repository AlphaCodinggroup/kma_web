"use client";

import React from "react";
import type { Role } from "@entities/user/model/sessions";

type AppHeaderProps = {
  title?: string;
  role?: Role | undefined;
};

const AppHeader: React.FC<AppHeaderProps> = ({
  title = "Audit Management System",
  role,
}) => {
  const displayRole = role ?? "Guest";

  return (
    <header className="sticky top-0 z-40 h-16 border-b border-gray-200 bg-white">
      <div className="flex h-full items-center justify-between px-6">
        <div className="text-xl font-bold tracking-wide text-black">
          {title}
        </div>

        <div className="flex items-center gap-3">
          <span
            className={[
              "inline-flex items-center rounded-full ",
              "bg-gray-100 px-3 py-1 text-xs font-bold text-gray-700",
            ].join(" ")}
          >
            {displayRole}
          </span>
        </div>
      </div>
    </header>
  );
};

export default AppHeader;
