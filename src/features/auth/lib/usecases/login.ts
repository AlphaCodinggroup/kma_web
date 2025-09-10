"use client";

import type { Session } from "@entities/user/model/sessions";
import type { AuthRepo } from "@entities/user/api/auth.repo";
import { authRepo } from "@features/auth/api/auth.repo.impl";

/** Iniciar sesión con usuario/contraseña */
export async function loginUsecase(
  input: { username: string; password: string },
  repo: AuthRepo = authRepo
): Promise<Session> {
  return repo.login(input);
}

/** Cerrar sesión (borra cookies httpOnly vía route handler) */
export async function logoutUsecase(repo: AuthRepo = authRepo): Promise<void> {
  return repo.logout();
}

/** Obtener estado de sesión (simple) */
export async function getSessionUsecase(
  repo: AuthRepo = authRepo
): Promise<Session> {
  return repo.getSession();
}
