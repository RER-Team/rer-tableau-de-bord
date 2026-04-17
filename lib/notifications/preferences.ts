import type { UserNotificationPreference } from "@prisma/client";

export const notificationPreferenceSelect = {
  emailEnabled: true,
  inAppEnabled: true,
  browserPushEnabled: true,
  onSubmitted: true,
  onCorrections: true,
  onPublished: true,
  onAuthorActions: true,
  onOwnArticles: true,
} as const;

export type NotificationPreferencePayload = {
  emailEnabled: boolean;
  inAppEnabled: boolean;
  browserPushEnabled: boolean;
  onSubmitted: boolean;
  onCorrections: boolean;
  onPublished: boolean;
  onAuthorActions: boolean;
  onOwnArticles: boolean;
};

export const defaultNotificationPreferences: NotificationPreferencePayload = {
  emailEnabled: true,
  inAppEnabled: true,
  browserPushEnabled: false,
  onSubmitted: true,
  onCorrections: true,
  onPublished: true,
  onAuthorActions: true,
  onOwnArticles: true,
};

export function toNotificationPreferencePayload(
  value:
    | Pick<
        UserNotificationPreference,
        | "emailEnabled"
        | "inAppEnabled"
        | "browserPushEnabled"
        | "onSubmitted"
        | "onCorrections"
        | "onPublished"
        | "onAuthorActions"
        | "onOwnArticles"
      >
    | null
    | undefined
): NotificationPreferencePayload {
  if (!value) return defaultNotificationPreferences;
  return {
    emailEnabled: value.emailEnabled,
    inAppEnabled: value.inAppEnabled,
    browserPushEnabled: value.browserPushEnabled,
    onSubmitted: value.onSubmitted,
    onCorrections: value.onCorrections,
    onPublished: value.onPublished,
    onAuthorActions: value.onAuthorActions,
    onOwnArticles: value.onOwnArticles,
  };
}

export function sanitizePreferencePatch(
  input: Record<string, unknown>
): Partial<NotificationPreferencePayload> {
  const keys: (keyof NotificationPreferencePayload)[] = [
    "emailEnabled",
    "inAppEnabled",
    "browserPushEnabled",
    "onSubmitted",
    "onCorrections",
    "onPublished",
    "onAuthorActions",
    "onOwnArticles",
  ];
  const out: Partial<NotificationPreferencePayload> = {};
  for (const key of keys) {
    if (typeof input[key] === "boolean") {
      out[key] = input[key] as boolean;
    }
  }
  return out;
}
