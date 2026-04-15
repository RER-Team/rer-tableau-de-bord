import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
  updateMany: vi.fn(),
  userUpdate: vi.fn(),
  tokenDeleteMany: vi.fn(),
  bcryptHash: vi.fn(),
  hashPasswordResetToken: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    passwordResetToken: {
      findUnique: mocks.findUnique,
      updateMany: mocks.updateMany,
      deleteMany: mocks.tokenDeleteMany,
    },
    user: {
      update: mocks.userUpdate,
    },
  },
}));

vi.mock("bcrypt", () => ({
  default: {
    hash: mocks.bcryptHash,
  },
}));

vi.mock("@/lib/password-reset", () => ({
  hashPasswordResetToken: mocks.hashPasswordResetToken,
}));

import { POST } from "@/app/api/auth/reset-password/route";

function makeRequest(body: unknown) {
  return {
    json: async () => body,
  } as any;
}

describe("POST /api/auth/reset-password", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.hashPasswordResetToken.mockReturnValue("hash-token");
    mocks.bcryptHash.mockResolvedValue("new-hash");
  });

  it("retourne 400 si token manquant", async () => {
    const response = await POST(makeRequest({ password: "motdepassefort123" }));
    expect(response.status).toBe(400);
  });

  it("retourne 400 si mot de passe invalide", async () => {
    const response = await POST(makeRequest({ token: "abc", password: "court" }));
    expect(response.status).toBe(400);
    expect(mocks.findUnique).not.toHaveBeenCalled();
  });

  it("retourne 400 si token invalide ou expiré", async () => {
    mocks.findUnique.mockResolvedValue(null);

    const response = await POST(
      makeRequest({ token: "abc", password: "motdepassefort123" })
    );
    expect(response.status).toBe(400);
  });

  it("retourne 400 en cas de concurrence sur la consommation du token", async () => {
    mocks.findUnique.mockResolvedValue({
      id: "prt-1",
      userId: "u-1",
      usedAt: null,
      expiresAt: new Date("2099-01-01T00:00:00.000Z"),
    });
    mocks.updateMany.mockResolvedValue({ count: 0 });

    const response = await POST(
      makeRequest({ token: "abc", password: "motdepassefort123" })
    );
    expect(response.status).toBe(400);
    expect(mocks.userUpdate).not.toHaveBeenCalled();
  });

  it("met à jour le mot de passe et invalide les tokens du user", async () => {
    mocks.findUnique.mockResolvedValue({
      id: "prt-1",
      userId: "u-1",
      usedAt: null,
      expiresAt: new Date("2099-01-01T00:00:00.000Z"),
    });
    mocks.updateMany.mockResolvedValue({ count: 1 });
    mocks.userUpdate.mockResolvedValue({ id: "u-1" });
    mocks.tokenDeleteMany.mockResolvedValue({ count: 1 });

    const response = await POST(
      makeRequest({ token: "abc", password: "motdepassefort123" })
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(mocks.bcryptHash).toHaveBeenCalledWith("motdepassefort123", 10);
    expect(mocks.userUpdate).toHaveBeenCalledWith({
      where: { id: "u-1" },
      data: { passwordHash: "new-hash" },
    });
    expect(mocks.tokenDeleteMany).toHaveBeenCalledWith({
      where: { userId: "u-1" },
    });
    const setCookie = response.headers.get("set-cookie") || "";
    expect(setCookie).toContain("next-auth.session-token=");
  });
});
