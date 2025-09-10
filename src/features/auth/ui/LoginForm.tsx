"use client";

import * as React from "react";
import {
  BrandTitle,
  Card,
  Field,
  Input,
  PasswordInput,
  Button,
  FormError,
} from "@shared/ui/controls";

export default function LoginForm() {
  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const userRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    // auto-focus en usuario
    userRef.current?.focus();
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!username || password.length < 6) {
      setError("Ingresá usuario y contraseña (mín. 6 caracteres).");
      return;
    }

    setLoading(true);
    try {
      // TODO: Reemplazar por backend real con cookies httpOnly:
      // const res = await fetch("/api/auth/login", {
      //   method: "POST",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify({ username, password }),
      //   credentials: "include",
      // });
      // if (!res.ok) throw new Error("Credenciales inválidas");
      // --> redirigir a /(dashboard) o /audits

      // Simulación mínima mientras no hay API:
      await new Promise((r) => setTimeout(r, 350));
    } catch (err: any) {
      setError(err?.message ?? "Error de autenticación");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-sm mx-auto">
      <BrandTitle title="KMA" className="mb-6" />
      <Card>
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <Field label="Usuario" htmlFor="username">
            <Input
              id="username"
              ref={userRef}
              placeholder="usuario"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              required
              aria-invalid={!!error && !username}
            />
          </Field>

          <Field label="Contraseña" htmlFor="password">
            <PasswordInput
              id="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              minLength={6}
              aria-invalid={!!error && password.length < 6}
            />
          </Field>

          <FormError message={error} />

          <Button type="submit" loading={loading} className="w-full">
            Entrar
          </Button>
        </form>
      </Card>
    </div>
  );
}
