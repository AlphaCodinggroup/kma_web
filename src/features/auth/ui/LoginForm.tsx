"use client";

import React from "react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Input, Label, ErrorText, HelpText } from "@shared/ui/controls";
import { loginWithPassword } from "@features/auth/lib/usecases/login";

// Esquema zod
const LoginSchema = z.object({
  username: z.string().min(1, "Enter your username"),
  password: z.string().min(1, "Enter your password"),
});

type FormValues = z.infer<typeof LoginSchema>;

const LoginForm: React.FC = () => {
  const router = useRouter();

  // Configuración react-hook-form con zod
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<FormValues>({
    resolver: zodResolver(LoginSchema),
    defaultValues: { username: "", password: "" },
    mode: "onSubmit",
    reValidateMode: "onChange",
  });

  // Error global para mostrar en el bloque inferior del form
  const [formError, setFormError] = React.useState<string | null>(null);

  // Handler onSubmit con try/catch
  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await loginWithPassword(values);
      // Importante: el route handler setea cookies httpOnly;
      // navegamos y refrescamos para asegurar estado.
      router.push("/dashboard" as Route);
      router.refresh();
    } catch (err: unknown) {
      const message: string =
        (typeof err === "object" && err !== null && "message" in err && typeof err.message === "string" && err.message) ||
        "Failed to log in. Please try again.";
      // Mostramos error global y, opcionalmente, marcamos ambos campos
      setFormError(message);
      setError("username", { type: "server", message: " " }); // espacio evita layout shift
      setError("password", { type: "server", message: " " });
    }
  });

  return (
    <div className="w-full">
      {/* Card */}
      <div className="w-full">
        {/* Header */}
        <div className="pb-2">
          <h1 className="kma-page-title text-[var(--kma-fg)]">
            Welcome back
          </h1>
          <p className="mt-2 text-[15px] text-[var(--kma-muted)]">
            Enter your credentials to access the audit workspace.
          </p>
        </div>

        {/* Form */}
        <form
          onSubmit={onSubmit}
          className="space-y-5 pt-6"
          noValidate
        >
          <div>
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              placeholder="Your username"
              autoComplete="username"
              aria-invalid={!!errors.username || !!formError}
              aria-describedby={errors.username ? "username-error" : "username-help"}
              {...register("username")}
            />
            {errors.username ? (
              <ErrorText id="username-error">{errors.username.message}</ErrorText>
            ) : (
              <HelpText id="username-help">Use your assigned username.</HelpText>
            )}
          </div>

          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              autoComplete="current-password"
              aria-invalid={!!errors.password || !!formError}
              aria-describedby={errors.password ? "password-error" : undefined}
              withPasswordToggle
              {...register("password")}
            />
            {errors.password ? (
              <ErrorText id="password-error">{errors.password.message}</ErrorText>
            ) : null}
          </div>

          {formError ? <div role="alert"><ErrorText>{formError}</ErrorText></div> : null}

          <Button
            type="submit"
            isLoading={isSubmitting}
            disabled={isSubmitting}
            className="w-full"
          >
            Log in
          </Button>
        </form>
      </div>
    </div>
  );
};

export default LoginForm;
