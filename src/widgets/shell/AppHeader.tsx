"use client";

import React from "react";

type AppHeaderProps = {
  title?: string;
  role?: string;
  /** Handler para abrir el menú de cuenta/perfil (opcional) */
  onAvatarClick?: () => void;
};

const AppHeader: React.FC<AppHeaderProps> = ({
  title = "Audit Management System",
  role = "Project Manager",
  onAvatarClick,
}) => {
  return (
    <header className="sticky top-0 z-40 h-16 border-b border-gray-200 bg-white">
      <div className="flex h-full items-center justify-between px-6">
        {/* Título izquierda */}
        <div className="text-xl font-bold tracking-wide text-black">
          {title}
        </div>

        {/* Rol + Avatar derecha */}
        <div className="flex items-center gap-3">
          <span
            className={[
              "inline-flex items-center rounded-full ",
              "bg-gray-100 px-3 py-1 text-xs font-bold text-gray-700",
            ].join(" ")}
          >
            {role}
          </span>

          <button
            type="button"
            aria-label="Open account menu"
            onClick={onAvatarClick}
            className={[
              "grid h-9 w-9 place-items-center rounded-full",
              "border border-gray-200 bg-gray-100 text-gray-600",
              "hover:bg-gray-200 cursor-pointer",
            ].join(" ")}
          >
            {/* Punto sutil para emular el “dot” de la referencia */}
            <span className="h-2 w-2 rounded-full bg-gray-400" />
          </button>
        </div>
      </div>
    </header>
  );
};

export default AppHeader;
