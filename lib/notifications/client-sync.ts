const NOTIFICATIONS_UPDATED_EVENT = "rer:notifications-updated";
const NOTIFICATIONS_UPDATED_STORAGE_KEY = "rer:notifications-updated";
const NOTIFICATIONS_UPDATED_CHANNEL = "rer-notifications";

type NotificationsUpdatedDetail = {
  unreadCount?: number;
};

function getBroadcastChannel(): BroadcastChannel | null {
  if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") {
    return null;
  }
  return new BroadcastChannel(NOTIFICATIONS_UPDATED_CHANNEL);
}

export function dispatchNotificationsUpdated(detail?: NotificationsUpdatedDetail): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<NotificationsUpdatedDetail>(NOTIFICATIONS_UPDATED_EVENT, { detail }));
  try {
    const channel = getBroadcastChannel();
    if (channel) {
      channel.postMessage(detail ?? {});
      channel.close();
      return;
    }
    window.localStorage.setItem(
      NOTIFICATIONS_UPDATED_STORAGE_KEY,
      JSON.stringify({ detail: detail ?? {}, ts: Date.now() })
    );
  } catch {
    // Aucune action: fallback silencieux si localStorage indisponible.
  }
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

  const channel = getBroadcastChannel();
  const channelHandler = (event: MessageEvent<NotificationsUpdatedDetail>) => {
    onUpdate(event.data);
  };
  if (channel) {
    channel.addEventListener("message", channelHandler);
  }

  const storageHandler = (event: StorageEvent) => {
    if (event.key !== NOTIFICATIONS_UPDATED_STORAGE_KEY || !event.newValue) return;
    try {
      const payload = JSON.parse(event.newValue) as { detail?: NotificationsUpdatedDetail };
      onUpdate(payload.detail);
    } catch {
      // Ignore les payloads invalides.
    }
  };
  window.addEventListener("storage", storageHandler);

  return () => {
    window.removeEventListener(NOTIFICATIONS_UPDATED_EVENT, handler);
    window.removeEventListener("storage", storageHandler);
    if (channel) {
      channel.removeEventListener("message", channelHandler);
      channel.close();
    }
  };
}
