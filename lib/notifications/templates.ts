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
  "{{adminSignature}}",
] as const;

export type TemplateVariables = {
  articleTitle: string;
  articleUrl: string;
  adminSignature?: string;
};

const defaultTemplateByEvent: Record<
  ArticleNotificationEventType,
  Omit<NotificationTemplatePayload, "eventType">
> = {
  "article.submitted": {
    emailSubject: "Changement d'étape : brouillon -> en relecture ({{articleTitle}})",
    emailText: [
      "Bonjour,",
      "",
      `L'article "{{articleTitle}}" a changé d'étape : brouillon -> en relecture.`,
      "Tu peux le consulter ici : {{articleUrl}}",
      "",
      "{{adminSignature}}",
    ].join("\n"),
    emailHtml:
      '<p>Bonjour,</p><p>L\'article "<strong>{{articleTitle}}</strong>" a changé d\'étape : brouillon -&gt; en relecture.</p><p><a href="{{articleUrl}}">Ouvrir l\'article</a></p><p>{{adminSignature}}</p>',
    inAppTitle: "Changement d'étape : en relecture",
    inAppBody:
      'L\'article "{{articleTitle}}" est passé de brouillon à en relecture. - {{adminSignature}}',
    pushTitle: "Étape article : en relecture",
    pushBody:
      '"{{articleTitle}}" : brouillon -> en relecture. {{adminSignature}}',
  },
  "article.corrections_requested_or_resubmitted": {
    emailSubject:
      "Changement d'étape : corrections / ré-soumission -> en relecture ({{articleTitle}})",
    emailText: [
      "Bonjour,",
      "",
      `L'article "{{articleTitle}}" a changé d'étape : corrections / ré-soumission -> en relecture.`,
      "Tu peux le consulter ici : {{articleUrl}}",
      "",
      "{{adminSignature}}",
    ].join("\n"),
    emailHtml:
      '<p>Bonjour,</p><p>L\'article "<strong>{{articleTitle}}</strong>" a changé d\'étape : corrections / ré-soumission -&gt; en relecture.</p><p><a href="{{articleUrl}}">Ouvrir l\'article</a></p><p>{{adminSignature}}</p>',
    inAppTitle: "Changement d'étape : retour en relecture",
    inAppBody:
      'L\'article "{{articleTitle}}" est passé en relecture après corrections / ré-soumission. - {{adminSignature}}',
    pushTitle: "Étape article : retour en relecture",
    pushBody:
      '"{{articleTitle}}" : corrections / ré-soumission -> en relecture. {{adminSignature}}',
  },
  "article.published": {
    emailSubject: "Changement d'étape : en relecture -> publié ({{articleTitle}})",
    emailText: [
      "Bonjour,",
      "",
      `L'article "{{articleTitle}}" a changé d'étape : en relecture -> publié.`,
      "Voir l'article publié : {{articleUrl}}",
      "",
      "{{adminSignature}}",
    ].join("\n"),
    emailHtml:
      '<p>Bonjour,</p><p>L\'article "<strong>{{articleTitle}}</strong>" a changé d\'étape : en relecture -&gt; publié.</p><p><a href="{{articleUrl}}">Voir l\'article publié</a></p><p>{{adminSignature}}</p>',
    inAppTitle: "Changement d'étape : publié",
    inAppBody:
      'L\'article "{{articleTitle}}" est passé de en relecture à publié. - {{adminSignature}}',
    pushTitle: "Étape article : publié",
    pushBody:
      '"{{articleTitle}}" : en relecture -> publié. {{adminSignature}}',
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
