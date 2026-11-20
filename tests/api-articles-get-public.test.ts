import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  articleFindMany: vi.fn(),
  articleCount: vi.fn(),
  getSessionUser: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    article: {
      findMany: mocks.articleFindMany,
      count: mocks.articleCount,
    },
  },
}));

vi.mock("@/lib/auth", () => ({
  getSessionUser: mocks.getSessionUser,
  canEditArticles: (role: string | undefined) =>
    role === "admin" || role === "relecteur",
}));

import { GET } from "@/app/api/articles/route";

const PUBLISHED = { slug: { in: ["publie", "valide"] } };

function lastWhere() {
  return mocks.articleFindMany.mock.calls.at(-1)?.[0]?.where;
}

describe("GET /api/articles - scope public", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.articleFindMany.mockResolvedValue([]);
    mocks.articleCount.mockResolvedValue(0);
    mocks.getSessionUser.mockResolvedValue(null);
  });

  it("restreint la liste publique aux articles publiés et cochés vitrine", async () => {
    const response = await GET({
      url: "http://localhost/api/articles?scope=public&page=1&limit=20",
    } as any);

    expect(response.status).toBe(200);
    expect(mocks.articleCount).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { etat: PUBLISHED, isExemplePublic: true },
      })
    );
  });
});

describe("GET /api/articles - scope app (liste connectée)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.articleFindMany.mockResolvedValue([]);
    mocks.articleCount.mockResolvedValue(0);
  });

  it("refuse un visiteur non connecté", async () => {
    mocks.getSessionUser.mockResolvedValue(null);
    const response = await GET({
      url: "http://localhost/api/articles?scope=app&page=2",
    } as any);
    expect(response.status).toBe(401);
    expect(mocks.articleFindMany).not.toHaveBeenCalled();
  });

  it("ne restreint pas à la vitrine et garde le filtre auteur", async () => {
    mocks.getSessionUser.mockResolvedValue({ id: "u1", role: "auteur" });
    const response = await GET({
      url: "http://localhost/api/articles?scope=app&page=2&etat=publie&auteurId=a1",
    } as any);
    expect(response.status).toBe(200);
    const where = lastWhere();
    expect(where.isExemplePublic).toBeUndefined();
    expect(where.auteurId).toBe("a1");
    expect(where.etat).toEqual(PUBLISHED);
  });

  it("force l'état publié pour un auteur même s'il demande les brouillons", async () => {
    mocks.getSessionUser.mockResolvedValue({ id: "u1", role: "auteur" });
    await GET({
      url: "http://localhost/api/articles?scope=app&etat=brouillon",
    } as any);
    expect(lastWhere().etat).toEqual(PUBLISHED);
  });

  it("respecte l'état demandé pour un relecteur", async () => {
    mocks.getSessionUser.mockResolvedValue({ id: "u2", role: "relecteur" });
    await GET({
      url: "http://localhost/api/articles?scope=app&etat=a_relire",
    } as any);
    expect(lastWhere().etat).not.toEqual(PUBLISHED);
  });
});
