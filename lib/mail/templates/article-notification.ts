import type { ArticleNotificationEventType } from "@/lib/notifications/article-events";
import {
  getDefaultNotificationTemplate,
  renderTemplate,
} from "@/lib/notifications/templates";

type BuildArticleNotificationTemplateArgs = {
  eventType: ArticleNotificationEventType;
  articleTitle: string;
  articleUrl: string;
};

export function buildArticleNotificationTemplate(
  args: BuildArticleNotificationTemplateArgs
): { subject: string; text: string; html: string } {
  const baseTemplate = getDefaultNotificationTemplate(args.eventType);
  const variables = {
    articleTitle: args.articleTitle,
    articleUrl: args.articleUrl,
  };
  return {
    subject: renderTemplate(baseTemplate.emailSubject, variables),
    text: renderTemplate(baseTemplate.emailText, variables),
    html: renderTemplate(baseTemplate.emailHtml, variables),
  };
}
