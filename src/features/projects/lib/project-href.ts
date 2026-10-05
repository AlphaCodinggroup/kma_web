import type { Route } from "next";
import type { ProjectId } from "@entities/projects/model";

/** Ruta del detalle de un proyecto. */
export function projectDetailHref(id: ProjectId): Route<`/projects/${string}`> {
  return `/projects/${encodeURIComponent(id)}` as Route<`/projects/${string}`>;
}
