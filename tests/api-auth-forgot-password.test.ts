import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  userFindUnique: vi.fn(),
  tokenDeleteMany: vi.fn(),
  tokenCreate: vi.fn(),
  generatePasswordResetToken: vi.fn(),
  hashPasswordResetToken: vi.fn(),
  getPasswordResetExpirationDate: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: mocks.userFindUnique,
    },
    passwordResetToken: {
      deleteMany: mocks.tokenDeleteMany,
      create: mocks.tokenCreate,
    },
  },
}));

vi.mock("@/lib/password-reset", () => ({
  normalizeEmail: (value: string) => value.trim().toLowerCase(),
  isValidEmail: (value: string) => value.includes("@"),
  generatePasswordResetToken: mocks.generatePasswordResetToken,
  hashPasswordResetToken: mocks.hashPasswordResetToken,
  getPasswordResetExpirationDate: mocks.getPasswordResetExpirationDate,
  buildPasswordResetUrl: (_baseUrl: string, token: string) =>
    `http://localhost:3000/reset-password?token=${token}`,
  sendPasswordResetEmail: mocks.sendPasswordResetEmail,
}));

import { POST } from "@/app/api/auth/forgot-password/route";

const GENERIC_MESSAGE =
  "Si un compte existe pour cet email, un lien de réinitialisation a été envoyé.";

function makeRequest(body: unknown, ip = "1.1.1.1") {
  return {
    json: async () => body,
    url: "http://localhost:3000/api/auth/forgot-password",
    headers: {
      get: (name: string) => {
        if (name.toLowerCase() === "x-forwarded-for") return ip;
        return null;
      },
    },
  } as any;
}

describe("POST /api/auth/forgot-password", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.generatePasswordResetToken.mockReturnValue("token-brut");
    mocks.hashPasswordResetToken.mockReturnValue("token-hash");
    mocks.getPasswordResetExpirationDate.mockReturnValue(
      new Date("2030-01-01T00:00:00.000Z")
    );
  });

  it("retourne un message générique si email invalide", async () => {
    const response = await POST(makeRequest({ email: "invalide" }));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.message).toBe(GENERIC_MESSAGE);
    expect(mocks.userFindUnique).not.toHaveBeenCalled();
  });

  it("retourne un message générique si utilisateur introuvable", async () => {
    mocks.userFindUnique.mockResolvedValue(null);

    const response = await POST(makeRequest({ email: "absent@example.com" }));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.message).toBe(GENERIC_MESSAGE);
    expect(mocks.tokenCreate).not.toHaveBeenCalled();
    expect(mocks.sendPasswordResetEmail).not.toHaveBeenCalled();
  });

  it("crée un token et envoie l'email pour un utilisateur éligible", async () => {
    mocks.userFindUnique.mockResolvedValue({
      id: "u1",
      email: "u1@example.com",
      passwordHash: "hash",
    });

    const response = await POST(makeRequest({ email: "u1@example.com" }));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.message).toBe(GENERIC_MESSAGE);
    expect(mocks.tokenDeleteMany).toHaveBeenCalledWith({ where: { userId: "u1" } });
    expect(mocks.tokenCreate).toHaveBeenCalledWith({
      data: {
        userId: "u1",
        tokenHash: "token-hash",
        expiresAt: new Date("2030-01-01T00:00:00.000Z"),
      },
    });
    expect(mocks.sendPasswordResetEmail).toHaveBeenCalledTimes(1);
  });

  it("applique un rate limit par email", async () => {
    mocks.userFindUnique.mockResolvedValue({
      id: "u-rate",
      email: "rate@example.com",
      passwordHash: "hash",
    });

    for (let i = 0; i < 5; i += 1) {
      const response = await POST(
        makeRequest({ email: "rate@example.com" }, `2.2.2.${i + 1}`)
      );
      expect(response.status).toBe(200);
    }

    const limited = await POST(
      makeRequest({ email: "rate@example.com" }, "2.2.2.100")
    );
    const data = await limited.json();
    expect(limited.status).toBe(200);
    expect(data.message).toBe(GENERIC_MESSAGE);
    expect(mocks.userFindUnique).toHaveBeenCalledTimes(5);
  });
});
