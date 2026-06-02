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

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/**
 * Normalise une URL destinée à un contexte HTML (attribut href).
 * Seuls les schémas http(s) sont acceptés afin d'éviter les injections
 * de type `javascript:` ; toute valeur invalide retombe sur "#".
 */
export function sanitizeHttpUrl(value: string): string {
  const trimmed = value.trim();
  // URL relative interne (ex: "/articles/123") : acceptée telle quelle.
  if (trimmed.startsWith("/")) return trimmed;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return parsed.toString();
    }
  } catch {
    // URL non parsable : on retombe sur le fallback.
  }
  return "#";
}

type RenderTemplateOptions = {
  /**
   * Lorsque true, les variables interpolées sont échappées pour un contexte
   * HTML (corps d'email HTML) et `articleUrl` est validée/normalisée.
   * Laisser à false pour les contextes texte (sujet, corps texte, push, in-app).
   */
  html?: boolean;
};

export function renderTemplate(
  template: string,
  variables: TemplateVariables,
  options: RenderTemplateOptions = {}
): string {
  const htmlContext = options.html === true;
  const articleTitle = htmlContext
    ? escapeHtml(variables.articleTitle)
    : variables.articleTitle;
  const articleUrl = htmlContext
    ? escapeHtml(sanitizeHttpUrl(variables.articleUrl))
    : variables.articleUrl;
  const prenom = variables.Prenom?.trim() || "à toi";
  const adminSignature = variables.adminSignature?.trim() || "Constance et Léa";

  return template
    .replaceAll("{{articleTitle}}", articleTitle)
    .replaceAll("{{articleUrl}}", articleUrl)
    .replaceAll("{{Prenom}}", htmlContext ? escapeHtml(prenom) : prenom)
    .replaceAll(
      "{{adminSignature}}",
      htmlContext ? escapeHtml(adminSignature) : adminSignature
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
