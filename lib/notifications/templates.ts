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
  "{{Prenom}}",
  "{{adminSignature}}",
] as const;

export type TemplateVariables = {
  articleTitle: string;
  articleUrl: string;
  Prenom?: string;
  adminSignature?: string;
};

const defaultTemplateByEvent: Record<
  ArticleNotificationEventType,
  Omit<NotificationTemplatePayload, "eventType">
> = {
  "article.submitted": {
    emailSubject: "Ton article est déposé : {{articleTitle}}",
    emailText: [
      "Bonjour {{Prenom}},",
      "",
      'Ton article "{{articleTitle}}" est bien déposé.',
      "Il est maintenant en relecture.",
      "Tu peux le consulter ici : {{articleUrl}}",
      "",
      "{{adminSignature}}",
    ].join("\n"),
    emailHtml:
      '<p>Bonjour {{Prenom}},</p><p>Ton article "<strong>{{articleTitle}}</strong>" est bien déposé.</p><p>Il est maintenant en relecture.</p><p><a href="{{articleUrl}}">Ouvrir l\'article</a></p><p>{{adminSignature}}</p>',
    inAppTitle: "Ton article est déposé",
    inAppBody:
      'Ton article "{{articleTitle}}" est maintenant en relecture. - {{adminSignature}}',
    pushTitle: "Ton article est déposé",
    pushBody:
      '"{{articleTitle}}" est en relecture. {{adminSignature}}',
  },
  "article.corrections_requested_or_resubmitted": {
    emailSubject: "Ton article est en cours de corrections : {{articleTitle}}",
    emailText: [
      "Bonjour {{Prenom}},",
      "",
      'Ton article "{{articleTitle}}" est en cours de corrections.',
      "Une nouvelle version a été prise en compte pour relecture.",
      "Tu peux le consulter ici : {{articleUrl}}",
      "",
      "{{adminSignature}}",
    ].join("\n"),
    emailHtml:
      '<p>Bonjour {{Prenom}},</p><p>Ton article "<strong>{{articleTitle}}</strong>" est en cours de corrections.</p><p>Une nouvelle version a été prise en compte pour relecture.</p><p><a href="{{articleUrl}}">Ouvrir l\'article</a></p><p>{{adminSignature}}</p>',
    inAppTitle: "Ton article est en cours de corrections",
    inAppBody:
      'Ton article "{{articleTitle}}" a été mis à jour pour relecture. - {{adminSignature}}',
    pushTitle: "Article en cours de corrections",
    pushBody:
      '"{{articleTitle}}" a été remis en relecture. {{adminSignature}}',
  },
  "article.published": {
    emailSubject: "Ton article est publié : {{articleTitle}}",
    emailText: [
      "Bonjour {{Prenom}},",
      "",
      `Bonne nouvelle : ton article "{{articleTitle}}" est publié.`,
      "Voir l'article publié : {{articleUrl}}",
      "",
      "{{adminSignature}}",
    ].join("\n"),
    emailHtml:
      '<p>Bonjour {{Prenom}},</p><p>Bonne nouvelle : ton article "<strong>{{articleTitle}}</strong>" est publié.</p><p><a href="{{articleUrl}}">Voir l\'article publié</a></p><p>{{adminSignature}}</p>',
    inAppTitle: "Ton article est publié",
    inAppBody:
      'Ton article "{{articleTitle}}" est maintenant publié. - {{adminSignature}}',
    pushTitle: "Ton article est publié",
    pushBody:
      '"{{articleTitle}}" est maintenant publié. {{adminSignature}}',
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
    .replaceAll("{{articleUrl}}", variables.articleUrl)
    .replaceAll("{{Prenom}}", variables.Prenom?.trim() || "à toi")
    .replaceAll(
      "{{adminSignature}}",
      variables.adminSignature?.trim() || "Constance et Léa"
    );
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
