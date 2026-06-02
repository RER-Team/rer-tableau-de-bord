import type { UserNotificationPreference } from "@prisma/client";

/**
 * Source unique de vérité des clés booléennes de préférences de notification.
 * Le type, les valeurs par défaut, le `select` Prisma, la conversion en payload
 * et la sanitization sont tous dérivés de cette liste pour éviter les divergences.
 */
export const NOTIFICATION_PREFERENCE_KEYS = [
  "emailEnabled",
  "inAppEnabled",
  "browserPushEnabled",
  "onSubmitted",
  "onCorrections",
  "onPublished",
  "onAuthorActions",
  "onOwnArticles",
  "emailOwnArticles",
  "emailAuthorActions",
  "inAppOwnArticles",
  "inAppAuthorActions",
  "browserPushOwnArticles",
  "browserPushAuthorActions",
  "onSubmittedOwnArticles",
  "onSubmittedAuthorActions",
  "onCorrectionsOwnArticles",
  "onCorrectionsAuthorActions",
  "onPublishedOwnArticles",
  "onPublishedAuthorActions",
] as const;

export type NotificationPreferenceKey = (typeof NOTIFICATION_PREFERENCE_KEYS)[number];

export type NotificationPreferencePayload = Record<
  NotificationPreferenceKey,
  boolean
>;

export const notificationPreferenceSelect = Object.fromEntries(
  NOTIFICATION_PREFERENCE_KEYS.map((key) => [key, true])
) as Record<NotificationPreferenceKey, true>;

export const defaultNotificationPreferences: NotificationPreferencePayload = {
  emailEnabled: true,
  inAppEnabled: true,
  browserPushEnabled: false,
  onSubmitted: true,
  onCorrections: true,
  onPublished: true,
  onAuthorActions: true,
  onOwnArticles: true,
  emailOwnArticles: true,
  emailAuthorActions: true,
  inAppOwnArticles: true,
  inAppAuthorActions: true,
  browserPushOwnArticles: false,
  browserPushAuthorActions: false,
  onSubmittedOwnArticles: true,
  onSubmittedAuthorActions: true,
  onCorrectionsOwnArticles: true,
  onCorrectionsAuthorActions: true,
  onPublishedOwnArticles: true,
  onPublishedAuthorActions: true,
};

export function toNotificationPreferencePayload(
  value:
    | Pick<UserNotificationPreference, NotificationPreferenceKey>
    | null
    | undefined
): NotificationPreferencePayload {
  if (!value) return defaultNotificationPreferences;
  const out = {} as NotificationPreferencePayload;
  for (const key of NOTIFICATION_PREFERENCE_KEYS) {
    out[key] = value[key];
  }
  return out;
}

export function sanitizePreferencePatch(
  input: Record<string, unknown>
): Partial<NotificationPreferencePayload> {
  const out: Partial<NotificationPreferencePayload> = {};
  for (const key of NOTIFICATION_PREFERENCE_KEYS) {
    if (typeof input[key] === "boolean") {
      out[key] = input[key] as boolean;
    }
  }
  return out;
}
