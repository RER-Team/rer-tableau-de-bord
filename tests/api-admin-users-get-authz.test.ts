import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSessionUser: vi.fn(),
  userFindMany: vi.fn(),
  auteurFindMany: vi.fn(),
  mutuelleFindMany: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getSessionUser: mocks.getSessionUser,
  isValidRole: (role: string) =>
    ["admin", "relecteur", "auteur", "lecteur"].includes(role),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findMany: mocks.userFindMany,
    },
    auteur: {
      findMany: mocks.auteurFindMany,
    },
    mutuelle: {
      findMany: mocks.mutuelleFindMany,
    },
  },
}));

import { GET } from "@/app/api/admin/users/route";

describe("GET /api/admin/users", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.userFindMany.mockResolvedValue([{ id: "u1", email: "a@b.c", role: "auteur" }]);
    mocks.auteurFindMany.mockResolvedValue([]);
    mocks.mutuelleFindMany.mockResolvedValue([]);
  });

  it("retourne 401 si non authentifié", async () => {
    mocks.getSessionUser.mockResolvedValue(null);
    const response = await GET({} as any);
    expect(response.status).toBe(401);
  });

  it("retourne 403 si rôle non autorisé", async () => {
    mocks.getSessionUser.mockResolvedValue({
      id: "u1",
      role: "auteur",
    });
    const response = await GET({} as any);
    expect(response.status).toBe(403);
  });

  it("retourne 403 pour un relecteur", async () => {
    mocks.getSessionUser.mockResolvedValue({
      id: "u2",
      role: "relecteur",
    });

    const response = await GET({} as any);
    expect(response.status).toBe(403);
  });

  it("retourne 200 pour admin avec select safe", async () => {
    mocks.getSessionUser.mockResolvedValue({
      id: "u3",
      role: "admin",
    });

    const response = await GET({} as any);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(Array.isArray(body.users)).toBe(true);
    const callArg = mocks.userFindMany.mock.calls[0]?.[0];
    expect(callArg?.select?.passwordHash).toBeUndefined();
    expect(callArg?.select?.email).toBe(true);
  });
});
