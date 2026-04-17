import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSessionUser: vi.fn(),
  findMany: vi.fn(),
  count: vi.fn(),
  updateMany: vi.fn(),
  deleteMany: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getSessionUser: mocks.getSessionUser,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    notification: {
      findMany: mocks.findMany,
      count: mocks.count,
      updateMany: mocks.updateMany,
      deleteMany: mocks.deleteMany,
    },
  },
}));

import { DELETE, GET, PATCH } from "@/app/api/notifications/route";

describe("/api/notifications route handlers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSessionUser.mockResolvedValue({ id: "u-1" });
    mocks.count.mockResolvedValueOnce(3).mockResolvedValueOnce(15);
    mocks.findMany.mockResolvedValue([
      {
        id: "n-3",
        type: "article.published.admin_alert",
        title: "Alerte",
        body: "Body",
        metadata: {},
        readAt: null,
        createdAt: new Date().toISOString(),
      },
      {
        id: "n-2",
        type: "article.published",
        title: "Publiée",
        body: "Body",
        metadata: {},
        readAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      },
    ]);
    mocks.updateMany.mockResolvedValue({ count: 1 });
    mocks.deleteMany.mockResolvedValue({ count: 2 });
  });

  it("liste les notifications avec pagination et filtre scope", async () => {
    const request = new Request(
      "http://localhost/api/notifications?take=20&status=all&scope=authorActions"
    ) as any;
    const response = await GET(request);
    expect(response.status).toBe(200);

    const payload = await response.json();
    expect(payload.unreadCount).toBe(3);
    expect(payload.totalCount).toBe(15);
    expect(payload.items).toHaveLength(2);
    expect(mocks.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          type: {
            in: [
              "article.submitted",
              "article.submitted.admin_alert",
              "article.corrections_requested_or_resubmitted",
              "article.published.admin_alert",
            ],
          },
        }),
      })
    );
  });

  it("marque des notifications comme non lues", async () => {
    const request = {
      json: async () => ({ ids: ["n-1"], markUnread: true }),
    } as any;
    const response = await PATCH(request);
    expect(response.status).toBe(200);
    expect(mocks.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: "u-1",
          id: { in: ["n-1"] },
        }),
        data: { readAt: null },
      })
    );
  });

  it("purge les notifications lues", async () => {
    const request = {
      json: async () => ({ readOnly: true }),
    } as any;
    const response = await DELETE(request);
    expect(response.status).toBe(200);
    expect(mocks.deleteMany).toHaveBeenCalledWith({
      where: { userId: "u-1", readAt: { not: null } },
    });
  });
});
