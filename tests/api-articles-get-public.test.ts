import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  articleFindMany: vi.fn(),
  articleCount: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    article: {
      findMany: mocks.articleFindMany,
      count: mocks.articleCount,
    },
  },
}));

import { GET } from "@/app/api/articles/route";

describe("GET /api/articles - scope public", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.articleFindMany.mockResolvedValue([]);
    mocks.articleCount.mockResolvedValue(0);
  });

  it("restreint la liste publique aux statuts publiés", async () => {
    const response = await GET({
      url: "http://localhost/api/articles?scope=public&page=1&limit=20",
    } as any);

    expect(response.status).toBe(200);
    expect(mocks.articleFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          etat: {
            slug: {
              in: ["publie", "valide"],
            },
          },
          isExemplePublic: true,
        }),
      })
    );
    expect(mocks.articleCount).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          etat: {
            slug: {
              in: ["publie", "valide"],
            },
          },
          isExemplePublic: true,
        },
      })
    );
  });
});
