import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSessionUser: vi.fn(),
  articleFindUnique: vi.fn(),
  articleUpdate: vi.fn(),
  etatFindFirst: vi.fn(),
  etatCreate: vi.fn(),
  etatFindUnique: vi.fn(),
  articleHistoriqueCreate: vi.fn(),
  dispatchArticleNotificationEvent: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getSessionUser: mocks.getSessionUser,
  canEditArticles: (role: string | undefined) =>
    role === "admin" || role === "relecteur",
}));

vi.mock("@/lib/ingest-debug", () => ({
  ingestDebug: vi.fn(),
}));

vi.mock("@/lib/sanitizeArticleHtml", () => ({
  sanitizeArticleHtml: (value: string) => value,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    article: {
      findUnique: mocks.articleFindUnique,
      update: mocks.articleUpdate,
    },
    etat: {
      findFirst: mocks.etatFindFirst,
      create: mocks.etatCreate,
      findUnique: mocks.etatFindUnique,
    },
    articleHistorique: {
      create: mocks.articleHistoriqueCreate,
    },
  },
}));

vi.mock("@/lib/notifications/dispatch", () => ({
  dispatchArticleNotificationEvent: mocks.dispatchArticleNotificationEvent,
}));

import { PATCH } from "@/app/api/articles/[id]/route";

function buildEtat(slug: "brouillon" | "a_relire" | "publie") {
  return {
    id: `etat-${slug}`,
    slug,
    libelle:
      slug === "brouillon"
        ? "Brouillon"
        : slug === "a_relire"
        ? "À relire"
        : "Publié",
    ordre: slug === "brouillon" ? -1 : slug === "a_relire" ? 1 : 2,
  };
}

describe("PATCH /api/articles/[id] - workflow", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.etatFindFirst.mockImplementation(async ({ where }: any) =>
      buildEtat(where.slug)
    );
    mocks.etatCreate.mockImplementation(async ({ data }: any) => ({
      id: `etat-${data.slug}`,
      ...data,
    }));
    mocks.etatFindUnique.mockImplementation(async ({ where }: any) => {
      const id = where.id as string;
      const slug = id.replace("etat-", "");
      if (slug === "brouillon" || slug === "a_relire" || slug === "publie") {
        return buildEtat(slug);
      }
      return null;
    });
    mocks.articleHistoriqueCreate.mockResolvedValue({ id: "h1" });
    mocks.articleUpdate.mockImplementation(async ({ data }: any) => {
      const nextSlug = data.etatId
        ? String(data.etatId).replace("etat-", "")
        : "a_relire";
      return {
        id: "a1",
        titre: data.titre ?? "Titre",
        auteurId: "author-1",
        etat: buildEtat(
          nextSlug === "brouillon" || nextSlug === "publie"
            ? nextSlug
            : "a_relire"
        ),
        historiques: [],
      };
    });
  });

  it("retourne 401 si non authentifié", async () => {
    mocks.getSessionUser.mockResolvedValue(null);

    const response = await PATCH(
      {
        json: async () => ({ titre: "Nouveau titre" }),
      } as any,
      { params: Promise.resolve({ id: "a1" }) }
    );

    expect(response.status).toBe(401);
    expect(mocks.articleFindUnique).not.toHaveBeenCalled();
  });

  it("empêche un auteur de publier directement", async () => {
    mocks.getSessionUser.mockResolvedValue({
      id: "u1",
      role: "auteur",
      auteurId: "author-1",
    });
    mocks.articleFindUnique.mockResolvedValue({
      id: "a1",
      auteurId: "author-1",
      etatId: "etat-a_relire",
      datePublication: null,
      dateDepot: new Date("2026-03-01T10:00:00.000Z"),
      contenu: "<p>Contenu initial</p>",
      lienPhoto: null,
      etat: { slug: "a_relire" },
    });

    const response = await PATCH(
      {
        json: async () => ({ etatSlug: "publie" }),
      } as any,
      { params: Promise.resolve({ id: "a1" }) }
    );

    expect(response.status).toBe(403);
    expect(mocks.articleUpdate).not.toHaveBeenCalled();
  });

  it("re-soumet un article à relire quand son auteur le modifie", async () => {
    mocks.getSessionUser.mockResolvedValue({
      id: "u1",
      role: "auteur",
      auteurId: "author-1",
    });
    mocks.articleFindUnique.mockResolvedValue({
      id: "a1",
      auteurId: "author-1",
      etatId: "etat-a_relire",
      datePublication: null,
      dateDepot: new Date("2026-03-01T10:00:00.000Z"),
      contenu: "<p>Contenu initial</p>",
      lienPhoto: null,
      etat: { slug: "a_relire" },
    });

    const response = await PATCH(
      {
        json: async () => ({ titre: "Titre retouché" }),
      } as any,
      { params: Promise.resolve({ id: "a1" }) }
    );

    expect(response.status).toBe(200);
    expect(mocks.articleUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          titre: "Titre retouché",
          etatId: "etat-a_relire",
          dateDepot: expect.any(Date),
        }),
      })
    );
    expect(mocks.articleHistoriqueCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          articleId: "a1",
          etatId: "etat-a_relire",
          userId: "u1",
        }),
      })
    );
  });

  it("empêche un auteur de modifier un article publié", async () => {
    mocks.getSessionUser.mockResolvedValue({
      id: "u1",
      role: "auteur",
      auteurId: "author-1",
    });
    mocks.articleFindUnique.mockResolvedValue({
      id: "a1",
      auteurId: "author-1",
      etatId: "etat-publie",
      datePublication: new Date("2026-03-01T10:00:00.000Z"),
      dateDepot: new Date("2026-03-01T10:00:00.000Z"),
      contenu: "<p>Contenu initial</p>",
      lienPhoto: null,
      etat: { slug: "publie" },
    });

    const response = await PATCH(
      {
        json: async () => ({ titre: "Titre interdit" }),
      } as any,
      { params: Promise.resolve({ id: "a1" }) }
    );

    expect(response.status).toBe(403);
    expect(mocks.articleUpdate).not.toHaveBeenCalled();
  });

  it("permet à un admin de publier un article", async () => {
    mocks.getSessionUser.mockResolvedValue({
      id: "admin-1",
      role: "admin",
      auteurId: null,
    });
    mocks.articleFindUnique.mockResolvedValue({
      id: "a1",
      auteurId: "author-1",
      etatId: "etat-a_relire",
      datePublication: null,
      dateDepot: new Date("2026-03-01T10:00:00.000Z"),
      contenu: "<p>Contenu initial</p>",
      lienPhoto: null,
      etat: { slug: "a_relire" },
    });

    const response = await PATCH(
      {
        json: async () => ({ etatSlug: "publie" }),
      } as any,
      { params: Promise.resolve({ id: "a1" }) }
    );

    expect(response.status).toBe(200);
    expect(mocks.articleUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          etatId: "etat-publie",
          datePublication: expect.any(Date),
        }),
      })
    );
    expect(mocks.articleHistoriqueCreate).toHaveBeenCalled();
  });
});
