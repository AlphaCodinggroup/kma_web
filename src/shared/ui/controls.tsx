"use client";

import * as React from "react";

// Brand: título y subtítulo
export function BrandTitle({
  title = "KMA",
  tagline,
  className = "",
}: {
  title?: string;
  tagline?: string;
  className?: string;
}) {
  return (
    <div className={`text-center ${className}`}>
      <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
      {tagline ? (
        <p className="mt-1 text-sm text-neutral-600">{tagline}</p>
      ) : null}
    </div>
  );
}

// Card contenedor (layout)
export function Card({
  children,
  className = "",
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`card p-6 md:p-8 space-y-6 ${className}`} {...props}>
      {children}
    </div>
  );
}

// Field + Label + Hint
export function Field({
  label,
  htmlFor,
  hint,
  children,
  className = "",
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`space-y-2 ${className}`}>
      <label htmlFor={htmlFor} className="text-sm font-medium">
        {label}
      </label>
      {children}
      {hint ? <p className="text-xs text-neutral-500">{hint}</p> : null}
    </div>
  );
}

//    Input de texto
export type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  invalid?: boolean;
};

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = "", id, invalid, ...props }, ref) => {
    return (
      <input
        id={id}
        ref={ref}
        className={`input ${
          invalid ? "ring-2 ring-red-500/40" : ""
        } ${className}`}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

//    Input de password (toggle)
export const PasswordInput = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = "", id, invalid, ...props }, ref) => {
    const [show, setShow] = React.useState(false);
    return (
      <div className="relative">
        <input
          id={id}
          ref={ref}
          type={show ? "text" : "password"}
          className={`input pr-20 ${
            invalid ? "ring-2 ring-red-500/40" : ""
          } ${className}`}
          {...props}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="absolute inset-y-0 right-1 my-1 rounded-md px-2 text-xs text-neutral-700 hover:bg-neutral-200/70"
          aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"}
        >
          {show ? "Ocultar" : "Mostrar"}
        </button>
      </div>
    );
  }
);
PasswordInput.displayName = "PasswordInput";

//    Botón primario
export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean;
};

export function Button({
  loading,
  className = "",
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`btn ${className}`}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading ? "Cargando…" : children}
    </button>
  );
}

//    Error de formulario
export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;
  return <p className="text-sm text-red-600">{message}</p>;
}
