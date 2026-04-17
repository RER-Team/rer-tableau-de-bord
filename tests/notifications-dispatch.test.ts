import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  articleFindUnique: vi.fn(),
  userFindFirst: vi.fn(),
  auteurFindUnique: vi.fn(),
  preferenceFindUnique: vi.fn(),
  templateFindUnique: vi.fn(),
  userFindUnique: vi.fn(),
  userFindMany: vi.fn(),
  notificationDeliveryFindUnique: vi.fn(),
  notificationCreate: vi.fn(),
  notificationDeliveryCreate: vi.fn(),
  transaction: vi.fn(),
  sendMail: vi.fn(),
}));

vi.mock("@/lib/mail", () => ({
  sendMail: mocks.sendMail,
}));

vi.mock("@/lib/notifications/reliability", () => ({
  retryWithTimeout: async (fn: () => Promise<unknown>) => fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    article: { findUnique: mocks.articleFindUnique },
    user: {
      findFirst: mocks.userFindFirst,
      findUnique: mocks.userFindUnique,
      findMany: mocks.userFindMany,
    },
    auteur: { findUnique: mocks.auteurFindUnique },
    userNotificationPreference: { findUnique: mocks.preferenceFindUnique },
    notificationTemplate: { findUnique: mocks.templateFindUnique },
    notificationDelivery: {
      findUnique: mocks.notificationDeliveryFindUnique,
      create: mocks.notificationDeliveryCreate,
    },
    notification: { create: mocks.notificationCreate },
    $transaction: mocks.transaction,
    pushSubscription: { findMany: vi.fn() },
  },
}));

import { dispatchArticleNotificationEvent } from "@/lib/notifications/dispatch";

describe("dispatchArticleNotificationEvent", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.articleFindUnique.mockResolvedValue({
      id: "article-1",
      titre: "Titre test",
      updatedAt: new Date("2026-04-17T10:00:00.000Z"),
      auteur: { id: "auteur-1", prenom: "Jean", nom: "Dupont" },
    });
    mocks.userFindFirst.mockResolvedValue({
      id: "user-auteur-1",
      email: "auteur@test.dev",
      role: "auteur",
    });
    mocks.auteurFindUnique.mockResolvedValue({ prenom: "Jean" });
    mocks.preferenceFindUnique.mockResolvedValue({
      emailEnabled: false,
      inAppEnabled: false,
      browserPushEnabled: false,
      onSubmitted: false,
      onCorrections: false,
      onPublished: false,
    });
    mocks.templateFindUnique.mockResolvedValue(null);
    mocks.userFindUnique.mockResolvedValue(null);
    mocks.userFindMany.mockResolvedValue([{ id: "admin-1" }, { id: "admin-2" }]);
    mocks.notificationDeliveryFindUnique.mockResolvedValue(null);
    mocks.notificationCreate.mockResolvedValue({ id: "n1" });
    mocks.notificationDeliveryCreate.mockResolvedValue({ id: "d1" });
    mocks.transaction.mockImplementation(async (ops: unknown[]) => Promise.all(ops));
    mocks.sendMail.mockResolvedValue(undefined);
  });

  it("envoie le mail admin de depot vers l'adresse contact fixe", async () => {
    await dispatchArticleNotificationEvent({
      event: {
        type: "article.submitted",
        articleId: "article-1",
        targetAuteurId: "auteur-1",
      },
    });

    expect(mocks.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "contact@reseaudesediteursderevues.org",
        tags: expect.arrayContaining(["article-submitted", "admin-alert"]),
      })
    );
  });

  it("cree des notifications in-app pour tous les admins lors du depot", async () => {
    await dispatchArticleNotificationEvent({
      event: {
        type: "article.submitted",
        articleId: "article-1",
        targetAuteurId: "auteur-1",
      },
    });

    expect(mocks.userFindMany).toHaveBeenCalledWith({
      where: { role: "admin" },
      select: { id: true },
    });
    expect(mocks.notificationCreate).toHaveBeenCalledTimes(2);
    expect(mocks.notificationCreate).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "admin-1",
          type: "article.submitted.admin_alert",
        }),
      })
    );
    expect(mocks.notificationCreate).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "admin-2",
          type: "article.submitted.admin_alert",
        }),
      })
    );
  });

  it("envoie l'alerte admin meme sans compte user lie a l'auteur", async () => {
    mocks.userFindFirst.mockResolvedValue(null);

    await dispatchArticleNotificationEvent({
      event: {
        type: "article.submitted",
        articleId: "article-1",
        targetAuteurId: "auteur-1",
      },
    });

    expect(mocks.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "contact@reseaudesediteursderevues.org",
      })
    );
    expect(mocks.userFindMany).toHaveBeenCalledWith({
      where: { role: "admin" },
      select: { id: true },
    });
    expect(mocks.preferenceFindUnique).not.toHaveBeenCalled();
  });
});
