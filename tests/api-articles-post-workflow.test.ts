import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSessionUser: vi.fn(),
  etatFindFirst: vi.fn(),
  etatCreate: vi.fn(),
  articleCreate: vi.fn(),
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
    etat: {
      findFirst: mocks.etatFindFirst,
      create: mocks.etatCreate,
    },
    article: {
      create: mocks.articleCreate,
    },
  },
}));

vi.mock("@/lib/notifications/dispatch", () => ({
  dispatchArticleNotificationEvent: mocks.dispatchArticleNotificationEvent,
}));

import { POST } from "@/app/api/articles/route";

describe("POST /api/articles - workflow dépôt", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.getSessionUser.mockResolvedValue({
      id: "u1",
      role: "auteur",
      auteurId: "author-1",
    });
    mocks.etatFindFirst.mockImplementation(async ({ where }: any) => ({
      id: `etat-${where.slug}`,
      slug: where.slug,
      libelle: where.slug,
      ordre: 1,
    }));
    mocks.etatCreate.mockImplementation(async ({ data }: any) => ({
      id: `etat-${data.slug}`,
      ...data,
    }));
    mocks.articleCreate.mockImplementation(async ({ data }: any) => ({
      id: "a1",
      ...data,
      etat: { id: data.etatId, slug: "a_relire", libelle: "À relire" },
      auteur: { id: "author-1" },
    }));
  });

  it("crée un article soumis en état a_relire", async () => {
    const response = await POST({
      json: async () => ({
        titre: "Mon article",
        contenuHtml: "<p>Contenu</p>",
        auteurId: "author-1",
        isDraft: false,
      }),
    } as any);

    expect(response.status).toBe(200);
    expect(mocks.etatFindFirst).toHaveBeenCalledWith({
      where: { slug: "a_relire" },
    });
    expect(mocks.articleCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          etatId: "etat-a_relire",
          dateDepot: expect.any(Date),
        }),
      })
    );
  });
});
