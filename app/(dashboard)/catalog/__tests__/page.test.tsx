import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import Page from "../page";
const session = vi.hoisted(() => ({ role: "admin" as string | null }));
vi.mock("@processes/auth/session", () => ({
  getServerSession: async () => ({
    authenticated: Boolean(session.role),
    user: session.role ? { role: session.role } : null,
  }),
}));
vi.mock("@features/catalog/ui/CatalogManager", () => ({
  default: () => <h1>Catalog manager</h1>,
}));
beforeEach(() => {
  session.role = "admin";
});
describe("Catalog server page", () => {
  it.each(["admin", "administrator"])(
    "renders management for a verified %s",
    async (role) => {
      session.role = role;
      render(await Page());
      expect(
        screen.getByRole("heading", { name: "Catalog manager" }),
      ).toBeInTheDocument();
    },
  );
  it.each(["auditor", "viewer", "qc", null])(
    "denies management for %s",
    async (role) => {
      session.role = role;
      render(await Page());
      expect(screen.getByRole("alert")).toHaveTextContent(
        "requires an administrator account",
      );
      expect(screen.queryByRole("heading")).not.toBeInTheDocument();
    },
  );
});
