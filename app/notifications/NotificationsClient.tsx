"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type NotificationItem = {
  id: string;
  type: string;
  title: string;
  body: string;
  metadata: unknown;
  readAt: string | null;
  createdAt: string;
};

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date inconnue";
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function NotificationsClient() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/notifications?limit=50", { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Impossible de charger les notifications.");
      }
      const payload = (await response.json()) as {
        items?: NotificationItem[];
        unreadCount?: number;
      };
      setItems(payload.items ?? []);
      setUnreadCount(payload.unreadCount ?? 0);
    } catch {
      setError("Impossible de charger vos notifications.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const markAsRead = useCallback(
    async (id: string) => {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [id] }),
      });
      await refresh();
    },
    [refresh]
  );

  const markAllAsRead = useCallback(async () => {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAllRead: true }),
    });
    await refresh();
  }, [refresh]);

  const hasUnread = useMemo(() => unreadCount > 0, [unreadCount]);

  return (
    <section className="space-y-4 rounded-xl border border-rer-border bg-white p-4 shadow-sm">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-rer-text">Centre de notifications</h2>
          <p className="text-sm text-rer-muted">
            {unreadCount} non lue{unreadCount > 1 ? "s" : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={markAllAsRead}
          disabled={!hasUnread || loading}
          className="rounded-lg border border-rer-border bg-white px-3 py-1.5 text-sm font-medium text-rer-text disabled:cursor-not-allowed disabled:opacity-60"
        >
          Tout marquer comme lu
        </button>
      </header>

      {error && <p className="rounded-lg bg-red-50 p-2 text-sm text-red-700">{error}</p>}
      {loading ? <p className="text-sm text-rer-muted">Chargement…</p> : null}

      {!loading && items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-rer-border p-4 text-sm text-rer-muted">
          Aucune notification pour le moment.
        </p>
      ) : null}

      <ul className="space-y-2">
        {items.map((item) => {
          const isRead = !!item.readAt;
          return (
            <li
              key={item.id}
              className={`rounded-lg border p-3 ${
                isRead ? "border-rer-border bg-white" : "border-rer-blue/30 bg-rer-blue/5"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-rer-text">{item.title}</p>
                  <p className="mt-1 text-sm text-rer-muted">{item.body}</p>
                  <p className="mt-2 text-xs text-rer-subtle">{formatDate(item.createdAt)}</p>
                </div>
                {!isRead ? (
                  <button
                    type="button"
                    onClick={() => void markAsRead(item.id)}
                    className="rounded-md border border-rer-border px-2 py-1 text-xs font-medium text-rer-text"
                  >
                    Marquer lu
                  </button>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
