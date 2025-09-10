"use client";

import * as React from "react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { Button, Input, Label, ErrorText, HelpText } from "@shared/ui/controls";
import { loginUsecase } from "@features/auth/lib/usecases/login";

const LoginSchema = z.object({
  username: z.string().min(1, "Enter your username"),
  password: z.string().min(1, "Enter your password"),
});

export default function LoginForm() {
  const router = useRouter();
  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);

    const parsed = LoginSchema.safeParse({ username, password });
    if (!parsed.success) {
      const msg = parsed.error.errors[0]?.message ?? "Check the entered data.";
      setFormError(msg);
      return;
    }

    // try {
    //   setIsLoading(true);
    //   await loginUsecase({ username, password });
    //   // Importante: el route handler setea cookies httpOnly;
    //   // navegamos y refrescamos para asegurar estado.
    //   router.push("/dashboard" as Route);
    //   router.refresh();
    // } catch (err: any) {
    //   setFormError(err?.message ?? "Failed to log in.");
    // } finally {
    //   setIsLoading(false);
    // }
    router.push("/dashboard" as Route);
  }

  return (
    <div className="w-full">
      {/* Card */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
        {/* Header */}
        <div className="px-6 pt-6 pb-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-black">
            KMA
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Log in to access the dashboard.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={onSubmit} className="px-6 pb-6 pt-4 space-y-4">
          <div>
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              name="username"
              placeholder="your-username"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              aria-invalid={!!formError}
            />
            <HelpText>Use your assigned username.</HelpText>
          </div>

          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-invalid={!!formError}
            />
          </div>

          {formError ? <ErrorText>{formError}</ErrorText> : null}

          <Button type="submit" isLoading={isLoading}>
            Log in
          </Button>
        </form>
      </div>
    </div>
  );
}
