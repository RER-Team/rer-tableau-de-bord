import type { ArticleNotificationEventType } from "@/lib/notifications/article-events";

type BuildArticleNotificationTemplateArgs = {
  eventType: ArticleNotificationEventType;
  articleTitle: string;
  articleUrl: string;
};

export function buildArticleNotificationTemplate(
  args: BuildArticleNotificationTemplateArgs
): { subject: string; text: string; html: string } {
  if (args.eventType === "article.submitted") {
    const subject = "Article depose pour relecture";
    const text = [
      "Bonjour,",
      "",
      `Votre article "${args.articleTitle}" a bien ete depose et transmis a la relecture.`,
      `Vous pouvez le consulter ici: ${args.articleUrl}`,
    ].join("\n");
    const html = `<p>Bonjour,</p><p>Votre article "<strong>${args.articleTitle}</strong>" a bien ete depose et transmis a la relecture.</p><p><a href="${args.articleUrl}">Ouvrir l'article</a></p>`;
    return { subject, text, html };
  }

  if (args.eventType === "article.corrections_requested_or_resubmitted") {
    const subject = "Mise a jour sur votre article";
    const text = [
      "Bonjour,",
      "",
      `Une mise a jour de correction a ete enregistree pour votre article "${args.articleTitle}".`,
      `Vous pouvez le consulter ici: ${args.articleUrl}`,
    ].join("\n");
    const html = `<p>Bonjour,</p><p>Une mise a jour de correction a ete enregistree pour votre article "<strong>${args.articleTitle}</strong>".</p><p><a href="${args.articleUrl}">Ouvrir l'article</a></p>`;
    return { subject, text, html };
  }

  const subject = "Article valide et publie";
  const text = [
    "Bonjour,",
    "",
    `Votre article "${args.articleTitle}" a ete valide et publie.`,
    `Vous pouvez le consulter ici: ${args.articleUrl}`,
  ].join("\n");
  const html = `<p>Bonjour,</p><p>Votre article "<strong>${args.articleTitle}</strong>" a ete valide et publie.</p><p><a href="${args.articleUrl}">Ouvrir l'article</a></p>`;
  return { subject, text, html };
}
