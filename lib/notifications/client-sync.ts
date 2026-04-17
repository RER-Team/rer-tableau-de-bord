const NOTIFICATIONS_UPDATED_EVENT = "rer:notifications-updated";

type NotificationsUpdatedDetail = {
  unreadCount?: number;
};

export function dispatchNotificationsUpdated(detail?: NotificationsUpdatedDetail): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<NotificationsUpdatedDetail>(NOTIFICATIONS_UPDATED_EVENT, { detail }));
}

export function subscribeToNotificationsUpdated(
  onUpdate: (detail?: NotificationsUpdatedDetail) => void
): () => void {
  if (typeof window === "undefined") return () => {};

  const handler = (event: Event) => {
    const customEvent = event as CustomEvent<NotificationsUpdatedDetail>;
    onUpdate(customEvent.detail);
  };
  window.addEventListener(NOTIFICATIONS_UPDATED_EVENT, handler);
  return () => {
    window.removeEventListener(NOTIFICATIONS_UPDATED_EVENT, handler);
  };
}
