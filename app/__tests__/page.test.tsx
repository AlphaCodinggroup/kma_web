/**
 * Raíz del sitio: siempre lleva al login.
 *
 * @vitest-environment node
 */
import { describe, expect, it, vi } from "vitest";

const redirect = vi.fn((_url: string) => {
  throw new Error("NEXT_REDIRECT");
});

vi.mock("next/navigation", () => ({
  redirect: (...args: unknown[]) => redirect(...(args as [string])),
}));

describe("Home", () => {
  it("redirects to /login", async () => {
    const { default: Home } = await import("../page");

    await expect(Home({} as never)).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith("/login");
  });
});
