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
  emailOwnArticles: true,
  emailAuthorActions: true,
  inAppOwnArticles: true,
  inAppAuthorActions: true,
  browserPushOwnArticles: true,
  browserPushAuthorActions: true,
  onSubmittedOwnArticles: true,
  onSubmittedAuthorActions: true,
  onCorrectionsOwnArticles: true,
  onCorrectionsAuthorActions: true,
  onPublishedOwnArticles: true,
  onPublishedAuthorActions: true,
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
  emailOwnArticles: boolean;
  emailAuthorActions: boolean;
  inAppOwnArticles: boolean;
  inAppAuthorActions: boolean;
  browserPushOwnArticles: boolean;
  browserPushAuthorActions: boolean;
  onSubmittedOwnArticles: boolean;
  onSubmittedAuthorActions: boolean;
  onCorrectionsOwnArticles: boolean;
  onCorrectionsAuthorActions: boolean;
  onPublishedOwnArticles: boolean;
  onPublishedAuthorActions: boolean;
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
        | "emailOwnArticles"
        | "emailAuthorActions"
        | "inAppOwnArticles"
        | "inAppAuthorActions"
        | "browserPushOwnArticles"
        | "browserPushAuthorActions"
        | "onSubmittedOwnArticles"
        | "onSubmittedAuthorActions"
        | "onCorrectionsOwnArticles"
        | "onCorrectionsAuthorActions"
        | "onPublishedOwnArticles"
        | "onPublishedAuthorActions"
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
    emailOwnArticles: value.emailOwnArticles,
    emailAuthorActions: value.emailAuthorActions,
    inAppOwnArticles: value.inAppOwnArticles,
    inAppAuthorActions: value.inAppAuthorActions,
    browserPushOwnArticles: value.browserPushOwnArticles,
    browserPushAuthorActions: value.browserPushAuthorActions,
    onSubmittedOwnArticles: value.onSubmittedOwnArticles,
    onSubmittedAuthorActions: value.onSubmittedAuthorActions,
    onCorrectionsOwnArticles: value.onCorrectionsOwnArticles,
    onCorrectionsAuthorActions: value.onCorrectionsAuthorActions,
    onPublishedOwnArticles: value.onPublishedOwnArticles,
    onPublishedAuthorActions: value.onPublishedAuthorActions,
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
  ];
  const out: Partial<NotificationPreferencePayload> = {};
  for (const key of keys) {
    if (typeof input[key] === "boolean") {
      out[key] = input[key] as boolean;
    }
  }
  return out;
}
