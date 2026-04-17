import { normalizeArticleStatusSlug } from "@/lib/article-status";

export type ArticleNotificationEventType =
  | "article.submitted"
  | "article.corrections_requested_or_resubmitted"
  | "article.published";

export type ArticleNotificationEvent = {
  type: ArticleNotificationEventType;
  articleId: string;
  actorUserId: string | null;
  targetAuteurId: string;
};

type BuildArticleEventArgs = {
  articleId: string;
  actorUserId: string | null;
  targetAuteurId: string;
  isCreate: boolean;
  toStatusSlug: string | null;
  fromStatusSlug?: string | null;
  authorResubmitted?: boolean;
};

export function buildArticleNotificationEvents(
  args: BuildArticleEventArgs
): ArticleNotificationEvent[] {
  const toStatus = normalizeArticleStatusSlug(args.toStatusSlug);
  const fromStatus = normalizeArticleStatusSlug(args.fromStatusSlug ?? null);
  const events: ArticleNotificationEvent[] = [];

  if (args.isCreate && toStatus === "a_relire") {
    events.push({
      type: "article.submitted",
      articleId: args.articleId,
      actorUserId: args.actorUserId,
      targetAuteurId: args.targetAuteurId,
    });
  }

  if (!args.isCreate) {
    const draftSubmitted = fromStatus === "brouillon" && toStatus === "a_relire";
    if (draftSubmitted) {
      events.push({
        type: "article.submitted",
        articleId: args.articleId,
        actorUserId: args.actorUserId,
        targetAuteurId: args.targetAuteurId,
      });
    }
    const movedToReview = toStatus === "a_relire" && fromStatus !== "a_relire";
    if ((movedToReview && !draftSubmitted) || args.authorResubmitted === true) {
      events.push({
        type: "article.corrections_requested_or_resubmitted",
        articleId: args.articleId,
        actorUserId: args.actorUserId,
        targetAuteurId: args.targetAuteurId,
      });
    }
  }

  if (toStatus === "publie" && fromStatus !== "publie") {
    events.push({
      type: "article.published",
      articleId: args.articleId,
      actorUserId: args.actorUserId,
      targetAuteurId: args.targetAuteurId,
    });
  }

  return events;
}
