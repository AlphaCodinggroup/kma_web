// ---------------------------------------------------------------------------
// Tests del repositorio HTTP de Users.
// ---------------------------------------------------------------------------

import { describe, it, expect, vi, beforeEach } from "vitest";

const { http } = vi.hoisted(() => ({
  http: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("@shared/api/http.client", () => ({ httpClient: http, default: http }));

import { UsersRepoHttp, usersRepoImpl } from "../users.repo.impl";
import { mapUsersListFromDTO, type UserDTO } from "@entities/user/lib/list.mappers";

const usersDTO: UserDTO[] = [
  {
    id: "u-1",
    cognito_id: "cog-1",
    name: "Ada Lovelace",
    email: "ada@example.com",
    role: "admin",
  },
  { id: "u-2", name: "Alan Turing", email: "alan@example.com", role: "auditor" },
];

beforeEach(() => {
  vi.resetAllMocks();
});

// ---------------------------------------------------------------------------
// getUsers
// ---------------------------------------------------------------------------

describe("UsersRepoHttp.getUsers", () => {
  it("calls GET with the role filter", async () => {
    http.get.mockResolvedValueOnce({ data: usersDTO });

    await new UsersRepoHttp().getUsers({ role: "auditor" });

    expect(http.get).toHaveBeenCalledWith("/api/users", {
      params: { role: "auditor" },
    });
  });

  it.each([
    ["no filters at all", undefined],
    ["an empty filter object", {}],
  ])("leaves role undefined with %s", async (_label, filters) => {
    http.get.mockResolvedValueOnce({ data: usersDTO });

    await new UsersRepoHttp().getUsers(filters);

    expect(http.get).toHaveBeenCalledWith("/api/users", {
      params: { role: undefined },
    });
  });

  it("maps the DTO list into the domain result", async () => {
    http.get.mockResolvedValueOnce({ data: usersDTO });

    const result = await new UsersRepoHttp().getUsers();

    expect(result).toEqual(mapUsersListFromDTO(usersDTO));
    expect(result.items).toHaveLength(2);
    expect(result.items[0]?.cognitoId).toBe("cog-1");
    // cognito_id ausente se normaliza a cadena vacía.
    expect(result.items[1]?.cognitoId).toBe("");
  });

  it("honours a custom base path", async () => {
    http.get.mockResolvedValueOnce({ data: [] });

    await new UsersRepoHttp("/api/v2/users").getUsers();

    expect(http.get).toHaveBeenCalledWith("/api/v2/users", {
      params: { role: undefined },
    });
  });
});

// ---------------------------------------------------------------------------
// Mutaciones
// ---------------------------------------------------------------------------

describe("UsersRepoHttp mutations", () => {
  it("posts the create payload as-is", async () => {
    http.post.mockResolvedValueOnce({ data: {} });
    const payload = {
      name: "Grace Hopper",
      email: "grace@example.com",
      role: "admin",
      password: "S3cret!",
    };

    await new UsersRepoHttp().createUser(payload);

    expect(http.post).toHaveBeenCalledWith("/api/users", payload);
  });

  it("patches a user by id", async () => {
    http.patch.mockResolvedValueOnce({ data: {} });

    await new UsersRepoHttp().updateUser("u-1", { name: "New Name" });

    expect(http.patch).toHaveBeenCalledWith("/api/users/u-1", {
      name: "New Name",
    });
  });

  it("deletes a user by id", async () => {
    http.delete.mockResolvedValueOnce({ data: undefined });

    await new UsersRepoHttp().deleteUser("u-2");

    expect(http.delete).toHaveBeenCalledWith("/api/users/u-2");
  });

  // El id se escapa en todos los repos por igual: sin eso, un id con "/" o con
  // espacios alcanza otra ruta del BFF.
  it.each([
    ["updateUser", "u/1", "/api/users/u%2F1"],
    ["deleteUser", "u 1", "/api/users/u%201"],
  ])("%s encodes the id (%s)", async (method, id, expectedUrl) => {
    const repo = new UsersRepoHttp();
    if (method === "updateUser") {
      http.patch.mockResolvedValueOnce({ data: {} });
      await repo.updateUser(id, { name: "x" });
      expect(http.patch).toHaveBeenCalledWith(expectedUrl, { name: "x" });
    } else {
      http.delete.mockResolvedValueOnce({ data: undefined });
      await repo.deleteUser(id);
      expect(http.delete).toHaveBeenCalledWith(expectedUrl);
    }
  });
});

// ---------------------------------------------------------------------------
// Normalización de errores
// ---------------------------------------------------------------------------

describe("UsersRepoHttp error normalisation", () => {
  const apiError = { code: "FORBIDDEN", message: "nope", details: { a: 1 } };

  it.each([
    ["getUsers", "get" as const, () => new UsersRepoHttp().getUsers()],
    [
      "createUser",
      "post" as const,
      () =>
        new UsersRepoHttp().createUser({
          name: "n",
          email: "e",
          role: "r",
          password: "p",
        }),
    ],
    [
      "updateUser",
      "patch" as const,
      () => new UsersRepoHttp().updateUser("u-1", {}),
    ],
    ["deleteUser", "delete" as const, () => new UsersRepoHttp().deleteUser("u-1")],
  ])("%s propagates an ApiError untouched", async (_label, verb, run) => {
    http[verb].mockRejectedValueOnce(apiError);

    await expect(run()).rejects.toEqual(apiError);
  });

  it.each([
    ["getUsers", "get" as const, () => new UsersRepoHttp().getUsers()],
    [
      "createUser",
      "post" as const,
      () =>
        new UsersRepoHttp().createUser({
          name: "n",
          email: "e",
          role: "r",
          password: "p",
        }),
    ],
    [
      "updateUser",
      "patch" as const,
      () => new UsersRepoHttp().updateUser("u-1", {}),
    ],
    ["deleteUser", "delete" as const, () => new UsersRepoHttp().deleteUser("u-1")],
  ])("%s wraps an unknown error", async (_label, verb, run) => {
    const raw = new Error("kaboom");
    http[verb].mockRejectedValueOnce(raw);

    await expect(run()).rejects.toEqual({
      code: "UNEXPECTED_ERROR",
      message: "Unexpected error",
      details: raw,
    });
  });
});

describe("usersRepoImpl", () => {
  it("is bound to the default base path", async () => {
    http.get.mockResolvedValueOnce({ data: [] });

    await usersRepoImpl.getUsers();

    expect(http.get).toHaveBeenCalledWith("/api/users", {
      params: { role: undefined },
    });
  });
});
