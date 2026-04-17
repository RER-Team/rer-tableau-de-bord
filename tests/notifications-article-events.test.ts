import { describe, expect, it } from "vitest";
import { buildArticleNotificationEvents } from "@/lib/notifications/article-events";

describe("buildArticleNotificationEvents", () => {
  it("declenche article.submitted a la creation en a_relire", () => {
    const events = buildArticleNotificationEvents({
      articleId: "a1",
      actorUserId: "u1",
      targetAuteurId: "author-1",
      isCreate: true,
      toStatusSlug: "a_relire",
    });

    expect(events).toEqual([
      expect.objectContaining({ type: "article.submitted", articleId: "a1" }),
    ]);
  });

  it("declenche la notif de corrections lors d'un retour a a_relire", () => {
    const events = buildArticleNotificationEvents({
      articleId: "a1",
      actorUserId: "u1",
      targetAuteurId: "author-1",
      isCreate: false,
      fromStatusSlug: "publie",
      toStatusSlug: "a_relire",
    });

    expect(events).toEqual([
      expect.objectContaining({
        type: "article.corrections_requested_or_resubmitted",
      }),
    ]);
  });

  it("declenche article.submitted lors du passage brouillon vers a_relire", () => {
    const events = buildArticleNotificationEvents({
      articleId: "a1",
      actorUserId: "u1",
      targetAuteurId: "author-1",
      isCreate: false,
      fromStatusSlug: "brouillon",
      toStatusSlug: "a_relire",
    });

    expect(events).toEqual([
      expect.objectContaining({
        type: "article.submitted",
      }),
    ]);
  });

  it("declenche article.published au passage vers publie", () => {
    const events = buildArticleNotificationEvents({
      articleId: "a1",
      actorUserId: "admin-1",
      targetAuteurId: "author-1",
      isCreate: false,
      fromStatusSlug: "a_relire",
      toStatusSlug: "publie",
    });

    expect(events).toEqual([
      expect.objectContaining({ type: "article.published" }),
    ]);
  });
});
