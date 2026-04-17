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

function getDayLabel(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date inconnue";
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const startOfTarget = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round(
    (startOfToday.getTime() - startOfTarget.getTime()) / (1000 * 60 * 60 * 24)
  );
  if (diffDays === 0) return "Aujourd'hui";
  if (diffDays === 1) return "Hier";
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "full" }).format(date);
}

export function NotificationsClient() {
  const PAGE_SIZE = 20;
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/notifications?limit=${PAGE_SIZE}`, { cache: "no-store" });
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
  const visibleItems = useMemo(
    () => (filter === "unread" ? items.filter((item) => !item.readAt) : items),
    [filter, items]
  );
  const groupedItems = useMemo(() => {
    const map = new Map<string, NotificationItem[]>();
    for (const item of visibleItems) {
      const key = getDayLabel(item.createdAt);
      const previous = map.get(key) ?? [];
      previous.push(item);
      map.set(key, previous);
    }
    return Array.from(map.entries());
  }, [visibleItems]);

  return (
    <section className="rounded-2xl border border-rer-border bg-white shadow-sm">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-rer-border px-4 py-4">
        <div>
          <h2 className="text-lg font-semibold text-rer-text">Centre de notifications</h2>
          <p className="text-sm text-rer-muted">
            {unreadCount} non lue{unreadCount > 1 ? "s" : ""} sur {items.length}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              filter === "all" ? "bg-rer-blue text-white" : "bg-rer-app text-rer-muted"
            }`}
          >
            Toutes
          </button>
          <button
            type="button"
            onClick={() => setFilter("unread")}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              filter === "unread" ? "bg-rer-blue text-white" : "bg-rer-app text-rer-muted"
            }`}
          >
            Non lues
          </button>
          <button
            type="button"
            onClick={markAllAsRead}
            disabled={!hasUnread || loading}
            className="rounded-lg border border-rer-border bg-white px-3 py-1.5 text-sm font-medium text-rer-text disabled:cursor-not-allowed disabled:opacity-60"
          >
            Tout marquer lu
          </button>
          <button
            type="button"
            onClick={() => void refresh()}
            disabled={loading}
            className="rounded-lg border border-rer-border bg-white px-3 py-1.5 text-sm font-medium text-rer-text disabled:cursor-not-allowed disabled:opacity-60"
          >
            Rafraîchir
          </button>
        </div>
      </header>

      <div className="space-y-3 p-4">
        {error && <p className="rounded-lg bg-red-50 p-2 text-sm text-red-700">{error}</p>}
        {loading ? <p className="text-sm text-rer-muted">Chargement…</p> : null}

        {!loading && visibleItems.length === 0 ? (
          <p className="rounded-lg border border-dashed border-rer-border p-6 text-sm text-rer-muted">
            {filter === "unread"
              ? "Aucune notification non lue."
              : "Aucune notification pour le moment."}
          </p>
        ) : null}

        <div className="space-y-4">
          {groupedItems.map(([dayLabel, dayItems]) => (
            <section key={dayLabel} className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-rer-subtle">
                {dayLabel}
              </h3>
              <ul className="space-y-2">
                {dayItems.map((item) => {
                  const isRead = !!item.readAt;
                  return (
                    <li
                      key={item.id}
                      className={`rounded-xl border p-3 transition-colors ${
                        isRead ? "border-rer-border bg-white" : "border-rer-blue/30 bg-rer-blue/5"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-rer-text">{item.title}</p>
                          <p className="text-sm text-rer-muted">{item.body}</p>
                          <p className="text-xs text-rer-subtle">{formatDate(item.createdAt)}</p>
                        </div>
                        {!isRead ? (
                          <button
                            type="button"
                            onClick={() => void markAsRead(item.id)}
                            className="rounded-md border border-rer-border px-2 py-1 text-xs font-medium text-rer-text"
                          >
                            Marquer lu
                          </button>
                        ) : (
                          <span className="rounded-full bg-rer-app px-2 py-1 text-[11px] text-rer-muted">
                            Lue
                          </span>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </section>
  );
}
