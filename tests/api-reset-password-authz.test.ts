import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSessionUser: vi.fn(),
  userUpdate: vi.fn(),
  hash: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getSessionUser: mocks.getSessionUser,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      update: mocks.userUpdate,
    },
  },
}));

vi.mock("bcrypt", () => ({
  default: {
    hash: mocks.hash,
  },
}));

import { POST } from "@/app/api/admin/users/[id]/reset-password/route";

describe("POST /api/admin/users/[id]/reset-password", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.hash.mockResolvedValue("hashed-password");
    mocks.userUpdate.mockResolvedValue({ id: "u1" });
  });

  it("retourne 403 si utilisateur non admin", async () => {
    mocks.getSessionUser.mockResolvedValue({
      id: "u1",
      role: "auteur",
    });

    const response = await POST(
      {
        json: async () => ({ password: "motdepasse123" }),
      } as any,
      { params: Promise.resolve({ id: "target-user-id" }) }
    );

    expect(response.status).toBe(403);
    expect(mocks.userUpdate).not.toHaveBeenCalled();
  });

  it("retourne 400 si mot de passe trop court", async () => {
    mocks.getSessionUser.mockResolvedValue({
      id: "admin-1",
      role: "admin",
    });

    const response = await POST(
      {
        json: async () => ({ password: "court" }),
      } as any,
      { params: Promise.resolve({ id: "target-user-id" }) }
    );

    expect(response.status).toBe(400);
    expect(mocks.userUpdate).not.toHaveBeenCalled();
  });

  it("met à jour le hash si admin et mot de passe valide", async () => {
    mocks.getSessionUser.mockResolvedValue({
      id: "admin-1",
      role: "admin",
    });

    const response = await POST(
      {
        json: async () => ({ password: "motdepasseTresFort123" }),
      } as any,
      { params: Promise.resolve({ id: "target-user-id" }) }
    );

    expect(response.status).toBe(200);
    expect(mocks.hash).toHaveBeenCalledWith("motdepasseTresFort123", 10);
    expect(mocks.userUpdate).toHaveBeenCalledWith({
      where: { id: "target-user-id" },
      data: { passwordHash: "hashed-password" },
    });
  });
});
