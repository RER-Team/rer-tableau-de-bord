import type { ArticleNotificationEventType } from "./article-events";

export const articleNotificationEventTypes: ArticleNotificationEventType[] = [
  "article.submitted",
  "article.corrections_requested_or_resubmitted",
  "article.published",
];

export type NotificationTemplatePayload = {
  eventType: ArticleNotificationEventType;
  emailSubject: string;
  emailText: string;
  emailHtml: string;
  inAppTitle: string;
  inAppBody: string;
  pushTitle: string;
  pushBody: string;
};

export const allowedTemplateVariables = [
  "{{articleTitle}}",
  "{{articleUrl}}",
] as const;

export type TemplateVariables = {
  articleTitle: string;
  articleUrl: string;
};

const defaultTemplateByEvent: Record<
  ArticleNotificationEventType,
  Omit<NotificationTemplatePayload, "eventType">
> = {
  "article.submitted": {
    emailSubject: "Tu as déposé ton article : {{articleTitle}}",
    emailText: [
      "Bonjour,",
      "",
      'Tu as bien déposé ton article "{{articleTitle}}".',
      "Il est maintenant en relecture.",
      "Tu peux le consulter ici : {{articleUrl}}",
    ].join("\n"),
    emailHtml:
      '<p>Bonjour,</p><p>Tu as bien déposé ton article "<strong>{{articleTitle}}</strong>".</p><p>Il est maintenant en relecture.</p><p><a href="{{articleUrl}}">Ouvrir l\'article</a></p>',
    inAppTitle: "Article déposé",
    inAppBody: 'Tu as déposé "{{articleTitle}}". Il est en relecture.',
    pushTitle: "Article déposé",
    pushBody: 'Tu as déposé "{{articleTitle}}".',
  },
  "article.corrections_requested_or_resubmitted": {
    emailSubject: "Corrections enregistrées : {{articleTitle}}",
    emailText: [
      "Bonjour,",
      "",
      'Une mise à jour de correction a été enregistrée pour ton article "{{articleTitle}}".',
      "Tu peux le consulter ici : {{articleUrl}}",
    ].join("\n"),
    emailHtml:
      '<p>Bonjour,</p><p>Une mise à jour de correction a été enregistrée pour ton article "<strong>{{articleTitle}}</strong>".</p><p><a href="{{articleUrl}}">Ouvrir l\'article</a></p>',
    inAppTitle: "Corrections enregistrées",
    inAppBody: 'Ton article "{{articleTitle}}" a été mis à jour.',
    pushTitle: "Corrections enregistrées",
    pushBody: 'Ton article "{{articleTitle}}" a été mis à jour.',
  },
  "article.published": {
    emailSubject: "Ton article est publié : {{articleTitle}}",
    emailText: [
      "Bonjour,",
      "",
      'Bonne nouvelle, ton article "{{articleTitle}}" est maintenant publié.',
      "Voir l'article publié : {{articleUrl}}",
    ].join("\n"),
    emailHtml:
      '<p>Bonjour,</p><p>Bonne nouvelle, ton article "<strong>{{articleTitle}}</strong>" est maintenant publié.</p><p><a href="{{articleUrl}}">Voir l\'article publié</a></p>',
    inAppTitle: "Article publié",
    inAppBody: 'Ton article "{{articleTitle}}" est publié.',
    pushTitle: "Article publié",
    pushBody: 'Ton article "{{articleTitle}}" est publié.',
  },
};

export function getDefaultNotificationTemplate(
  eventType: ArticleNotificationEventType
): NotificationTemplatePayload {
  return {
    eventType,
    ...defaultTemplateByEvent[eventType],
  };
}

export function renderTemplate(
  template: string,
  variables: TemplateVariables
): string {
  return template
    .replaceAll("{{articleTitle}}", variables.articleTitle)
    .replaceAll("{{articleUrl}}", variables.articleUrl);
}

export function validateTemplateVariables(value: string): string[] {
  const matches = value.match(/\{\{[^}]+\}\}/g) ?? [];
  const allowed = new Set(allowedTemplateVariables);
  const invalid = matches.filter((match) => !allowed.has(match as any));
  return Array.from(new Set(invalid));
}

export function isArticleNotificationEventType(
  value: string
): value is ArticleNotificationEventType {
  return (articleNotificationEventTypes as string[]).includes(value);
}
