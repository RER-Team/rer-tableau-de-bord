import type { UserNotificationPreference } from "@prisma/client";

export const notificationPreferenceSelect = {
  emailEnabled: true,
  inAppEnabled: true,
  browserPushEnabled: true,
  onSubmitted: true,
  onCorrections: true,
  onPublished: true,
} as const;

export type NotificationPreferencePayload = {
  emailEnabled: boolean;
  inAppEnabled: boolean;
  browserPushEnabled: boolean;
  onSubmitted: boolean;
  onCorrections: boolean;
  onPublished: boolean;
};

export const defaultNotificationPreferences: NotificationPreferencePayload = {
  emailEnabled: true,
  inAppEnabled: true,
  browserPushEnabled: false,
  onSubmitted: true,
  onCorrections: true,
  onPublished: true,
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
  ];
  const out: Partial<NotificationPreferencePayload> = {};
  for (const key of keys) {
    if (typeof input[key] === "boolean") {
      out[key] = input[key] as boolean;
    }
  }
  return out;
}
