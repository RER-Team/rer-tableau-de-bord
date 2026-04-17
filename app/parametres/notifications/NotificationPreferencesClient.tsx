"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";

type Preferences = {
  emailEnabled: boolean;
  inAppEnabled: boolean;
  browserPushEnabled: boolean;
  onSubmitted: boolean;
  onCorrections: boolean;
  onPublished: boolean;
  onAuthorActions: boolean;
  onOwnArticles: boolean;
};

const defaultPreferences: Preferences = {
  emailEnabled: true,
  inAppEnabled: true,
  browserPushEnabled: false,
  onSubmitted: true,
  onCorrections: true,
  onPublished: true,
  onAuthorActions: true,
  onOwnArticles: true,
};

function base64UrlToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function toArrayBuffer(view: Uint8Array): ArrayBuffer {
  return view.buffer.slice(view.byteOffset, view.byteOffset + view.byteLength) as ArrayBuffer;
}

export function NotificationPreferencesClient() {
  const { data: session } = useSession();
  const [preferences, setPreferences] = useState<Preferences>(defaultPreferences);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pushEnabledOnServer, setPushEnabledOnServer] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [prefResponse, pushResponse] = await Promise.all([
        fetch("/api/notifications/preferences", { cache: "no-store" }),
        fetch("/api/notifications/push-subscriptions", { cache: "no-store" }),
      ]);
      if (!prefResponse.ok) throw new Error("Impossible de charger les préférences.");
      const prefPayload = (await prefResponse.json()) as Preferences;
      setPreferences({ ...defaultPreferences, ...prefPayload });
      if (pushResponse.ok) {
        const pushPayload = (await pushResponse.json()) as { enabled?: boolean };
        setPushEnabledOnServer(Boolean(pushPayload.enabled));
      } else {
        setPushEnabledOnServer(false);
      }
    } catch {
      setError("Impossible de charger les préférences de notification.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const patchPreferences = useCallback(async (patch: Partial<Preferences>) => {
    setSaving(true);
    setError(null);
    setMessage(null);
    const previous = preferences;
    const next = { ...previous, ...patch };
    setPreferences(next);
    try {
      const response = await fetch("/api/notifications/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!response.ok) {
        throw new Error("Sauvegarde impossible.");
      }
      const payload = (await response.json()) as Preferences;
      setPreferences({ ...defaultPreferences, ...payload });
      setMessage("Preferences enregistrees.");
    } catch {
      setPreferences(previous);
      setError("Echec de la sauvegarde. Reessayez.");
    } finally {
      setSaving(false);
    }
  }, [preferences]);

  const handleBrowserPushToggle = useCallback(
    async (enabled: boolean) => {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        setError("Ce navigateur ne supporte pas les notifications push.");
        return;
      }
      if (!pushEnabledOnServer) {
        setError("Les notifications navigateur ne sont pas configurees cote serveur.");
        return;
      }

      try {
        await navigator.serviceWorker.register("/notifications-sw.js");
        const registration = await navigator.serviceWorker.ready;
        if (enabled) {
          if (Notification.permission === "denied") {
            throw new Error("Permission navigateur déjà refusée.");
          }
          const permission = await Notification.requestPermission();
          if (permission !== "granted") {
            throw new Error("Permission refusee.");
          }
          const existingSubscription = await registration.pushManager.getSubscription();
          if (existingSubscription) {
            const registerExistingResponse = await fetch("/api/notifications/push-subscriptions", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(existingSubscription),
            });
            if (!registerExistingResponse.ok) {
              throw new Error("Sauvegarde de l'abonnement existant impossible.");
            }
            await patchPreferences({ browserPushEnabled: true });
            return;
          }
          const pushConfigResponse = await fetch("/api/notifications/push-subscriptions", {
            cache: "no-store",
          });
          if (!pushConfigResponse.ok) {
            throw new Error("Configuration push indisponible.");
          }
          const pushConfig = (await pushConfigResponse.json()) as { publicKey?: string };
          if (!pushConfig.publicKey) throw new Error("Cle VAPID indisponible.");
          const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: toArrayBuffer(base64UrlToUint8Array(pushConfig.publicKey)),
          });
          const subscribeResponse = await fetch("/api/notifications/push-subscriptions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(subscription),
          });
          if (!subscribeResponse.ok) {
            throw new Error("Sauvegarde de l'abonnement impossible.");
          }
          await patchPreferences({ browserPushEnabled: true });
        } else {
          const subscription = await registration.pushManager.getSubscription();
          if (subscription) {
            const deleteResponse = await fetch("/api/notifications/push-subscriptions", {
              method: "DELETE",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ endpoint: subscription.endpoint }),
            });
            if (!deleteResponse.ok) {
              throw new Error("Suppression de l'abonnement impossible.");
            }
            await subscription.unsubscribe();
          }
          await patchPreferences({ browserPushEnabled: false });
        }
      } catch {
        setError(
          enabled
            ? "Activation des notifications navigateur impossible."
            : "Desactivation des notifications navigateur impossible."
        );
      }
    },
    [patchPreferences, pushEnabledOnServer]
  );

  const isBrowserToggleDisabled = useMemo(
    () => saving || loading || !pushEnabledOnServer,
    [saving, loading, pushEnabledOnServer]
  );
  const isAdmin = session?.user?.role === "admin";

  return (
    <section className="space-y-4 rounded-xl border border-rer-border bg-white p-4 shadow-sm">
      <h2 className="text-lg font-semibold text-rer-text">Preferences de notifications</h2>

      {loading ? <p className="text-sm text-rer-muted">Chargement…</p> : null}
      {error ? <p className="rounded-lg bg-red-50 p-2 text-sm text-red-700">{error}</p> : null}
      {message ? <p className="rounded-lg bg-green-50 p-2 text-sm text-green-700">{message}</p> : null}

      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-rer-text">Canaux</h3>
        <label className="flex items-center justify-between gap-3 rounded-lg border border-rer-border p-2 text-sm">
          <span>Email</span>
          <input
            type="checkbox"
            checked={preferences.emailEnabled}
            disabled={saving || loading}
            onChange={(event) => void patchPreferences({ emailEnabled: event.target.checked })}
          />
        </label>
        <label className="flex items-center justify-between gap-3 rounded-lg border border-rer-border p-2 text-sm">
          <span>Notification dans l&apos;interface</span>
          <input
            type="checkbox"
            checked={preferences.inAppEnabled}
            disabled={saving || loading}
            onChange={(event) => void patchPreferences({ inAppEnabled: event.target.checked })}
          />
        </label>
        <label className="flex items-center justify-between gap-3 rounded-lg border border-rer-border p-2 text-sm">
          <span>Notification navigateur</span>
          <input
            type="checkbox"
            checked={preferences.browserPushEnabled}
            disabled={isBrowserToggleDisabled}
            onChange={(event) => void handleBrowserPushToggle(event.target.checked)}
          />
        </label>
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-rer-text">Evenements</h3>
        <label className="flex items-center justify-between gap-3 rounded-lg border border-rer-border p-2 text-sm">
          <span>Depot de l&apos;article</span>
          <input
            type="checkbox"
            checked={preferences.onSubmitted}
            disabled={saving || loading}
            onChange={(event) => void patchPreferences({ onSubmitted: event.target.checked })}
          />
        </label>
        <label className="flex items-center justify-between gap-3 rounded-lg border border-rer-border p-2 text-sm">
          <span>Corrections effectuees</span>
          <input
            type="checkbox"
            checked={preferences.onCorrections}
            disabled={saving || loading}
            onChange={(event) => void patchPreferences({ onCorrections: event.target.checked })}
          />
        </label>
        <label className="flex items-center justify-between gap-3 rounded-lg border border-rer-border p-2 text-sm">
          <span>Validation et publication</span>
          <input
            type="checkbox"
            checked={preferences.onPublished}
            disabled={saving || loading}
            onChange={(event) => void patchPreferences({ onPublished: event.target.checked })}
          />
        </label>
      </div>

      {isAdmin ? (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-rer-text">Perimetre admin</h3>
          <label className="flex items-center justify-between gap-3 rounded-lg border border-rer-border p-2 text-sm">
            <span>Actions auteurs (depot / publication)</span>
            <input
              type="checkbox"
              checked={preferences.onAuthorActions}
              disabled={saving || loading}
              onChange={(event) =>
                void patchPreferences({ onAuthorActions: event.target.checked })
              }
            />
          </label>
          <label className="flex items-center justify-between gap-3 rounded-lg border border-rer-border p-2 text-sm">
            <span>Actions sur mes articles</span>
            <input
              type="checkbox"
              checked={preferences.onOwnArticles}
              disabled={saving || loading}
              onChange={(event) => void patchPreferences({ onOwnArticles: event.target.checked })}
            />
          </label>
        </div>
      ) : null}
    </section>
  );
}
