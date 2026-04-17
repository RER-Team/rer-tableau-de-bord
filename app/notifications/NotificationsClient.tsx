"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { dispatchNotificationsUpdated } from "@/lib/notifications/client-sync";

type NotificationItem = {
  id: string;
  type: string;
  title: string;
  body: string;
  metadata: unknown;
  readAt: string | null;
  createdAt: string;
};

type NotificationStatusFilter = "all" | "unread" | "read";
type NotificationScopeFilter = "all" | "adminArticles" | "authorActions";

type NotificationsPayload = {
  items?: NotificationItem[];
  unreadCount?: number;
  totalCount?: number;
  hasMore?: boolean;
  nextCursor?: string | null;
};

type FeedbackMessage = {
  tone: "success" | "error";
  text: string;
};

type NotificationsClientProps = {
  variant?: "page" | "popover";
  onNavigate?: () => void;
};

function buttonBaseClass(isActive = false): string {
  const activeClass = isActive
    ? "bg-rer-blue text-white shadow-sm"
    : "bg-rer-app text-rer-muted hover:bg-rer-border hover:text-rer-text";
  return `rounded-full px-3 py-1 text-xs font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rer-blue focus-visible:ring-offset-2 ${activeClass}`;
}

function actionButtonClass(kind: "default" | "danger" = "default"): string {
  const style =
    kind === "danger"
      ? "border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
      : "border-rer-border bg-white text-rer-text hover:border-rer-blue/40 hover:bg-rer-app";
  return `rounded-lg border px-3 py-1.5 text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rer-blue focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${style}`;
}

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

function getNotificationScope(item: NotificationItem): Exclude<NotificationScopeFilter, "all"> {
  if (item.metadata && typeof item.metadata === "object") {
    const metadataScope = (item.metadata as Record<string, unknown>).scope;
    if (metadataScope === "adminArticles" || metadataScope === "authorActions") {
      return metadataScope;
    }
  }
  if (
    item.type === "article.submitted" ||
    item.type === "article.corrections_requested_or_resubmitted" ||
    item.type.endsWith(".admin_alert")
  ) {
    return "authorActions";
  }
  return "adminArticles";
}

function getArticleHref(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== "object") return null;
  const articleId = (metadata as Record<string, unknown>).articleId;
  if (typeof articleId !== "string" || articleId.length === 0) return null;
  return `/articles/${articleId}`;
}

export function NotificationsClient({ variant = "page", onNavigate }: NotificationsClientProps) {
  const PAGE_SIZE = variant === "popover" ? 12 : 20;
  const isPopover = variant === "popover";
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<NotificationStatusFilter>("all");
  const [scopeFilter, setScopeFilter] = useState<NotificationScopeFilter>("all");
  const [feedback, setFeedback] = useState<FeedbackMessage | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    setFeedback(null);
    try {
      const params = new URLSearchParams({
        take: String(PAGE_SIZE),
        status: statusFilter,
        scope: scopeFilter,
      });
      if (isPopover) {
        params.set("view", "popover");
      }
      const response = await fetch(`/api/notifications?${params.toString()}`, { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Impossible de charger les notifications.");
      }
      const payload = (await response.json()) as NotificationsPayload;
      setItems(payload.items ?? []);
      const nextUnreadCount = payload.unreadCount ?? 0;
      setUnreadCount(nextUnreadCount);
      setTotalCount(payload.totalCount ?? 0);
      setHasMore(payload.hasMore ?? false);
      setNextCursor(payload.nextCursor ?? null);
      // Synchronise la cloche partout dans l'app meme sur un refresh manuel.
      dispatchNotificationsUpdated({ unreadCount: nextUnreadCount });
      return nextUnreadCount;
    } catch {
      setError("Impossible de charger vos notifications.");
      return null;
    } finally {
      setLoading(false);
    }
  }, [PAGE_SIZE, isPopover, scopeFilter, statusFilter]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const loadMore = useCallback(async () => {
    if (!hasMore || !nextCursor || loadingMore) return;
    setLoadingMore(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        take: String(PAGE_SIZE),
        status: statusFilter,
        scope: scopeFilter,
        cursor: nextCursor,
      });
      if (isPopover) {
        params.set("view", "popover");
      }
      const response = await fetch(`/api/notifications?${params.toString()}`, { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Impossible de charger plus de notifications.");
      }
      const payload = (await response.json()) as NotificationsPayload;
      setItems((prev) => [...prev, ...(payload.items ?? [])]);
      setHasMore(payload.hasMore ?? false);
      setNextCursor(payload.nextCursor ?? null);
    } catch {
      setError("Impossible de charger plus de notifications.");
    } finally {
      setLoadingMore(false);
    }
  }, [PAGE_SIZE, hasMore, isPopover, loadingMore, nextCursor, scopeFilter, statusFilter]);

  const mutateNotifications = useCallback(
    async (
      request: () => Promise<Response>,
      successMessage: string,
      errorMessage: string
    ) => {
      setFeedback(null);
      const response = await request();
      if (!response.ok) {
        throw new Error(errorMessage);
      }
      setFeedback({ tone: "success", text: successMessage });
      await refresh();
    },
    [refresh]
  );

  const markAsRead = useCallback(
    async (id: string) => {
      try {
        await mutateNotifications(
          () =>
            fetch("/api/notifications", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ids: [id] }),
            }),
          "Notification marquée comme lue.",
          "Impossible de marquer la notification comme lue."
        );
      } catch {
        setFeedback({ tone: "error", text: "Impossible de marquer la notification comme lue." });
      }
    },
    [mutateNotifications]
  );

  const markAsUnread = useCallback(
    async (id: string) => {
      try {
        await mutateNotifications(
          () =>
            fetch("/api/notifications", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ids: [id], markUnread: true }),
            }),
          "Notification marquée comme non lue.",
          "Impossible de marquer la notification comme non lue."
        );
      } catch {
        setFeedback({
          tone: "error",
          text: "Impossible de marquer la notification comme non lue.",
        });
      }
    },
    [mutateNotifications]
  );

  const markAllAsRead = useCallback(async () => {
    if (unreadCount === 0) return;
    try {
      await mutateNotifications(
        () =>
          fetch("/api/notifications", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ markAllRead: true }),
          }),
        "Toutes les notifications non lues ont été marquées comme lues.",
        "Impossible de marquer toutes les notifications comme lues."
      );
    } catch {
      setFeedback({
        tone: "error",
        text: "Impossible de marquer toutes les notifications comme lues.",
      });
    }
  }, [mutateNotifications, unreadCount]);

  const deleteOne = useCallback(
    async (id: string) => {
      const confirmed = window.confirm("Supprimer cette notification ?");
      if (!confirmed) return;
      try {
        await mutateNotifications(
          () =>
            fetch("/api/notifications", {
              method: "DELETE",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ids: [id] }),
            }),
          "Notification supprimée.",
          "Impossible de supprimer la notification."
        );
      } catch {
        setFeedback({ tone: "error", text: "Impossible de supprimer la notification." });
      }
    },
    [mutateNotifications]
  );

  const purgeRead = useCallback(async () => {
    const confirmed = window.confirm("Supprimer toutes les notifications lues ?");
    if (!confirmed) return;
    try {
      await mutateNotifications(
        () =>
          fetch("/api/notifications", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ readOnly: true }),
          }),
        "Les notifications lues ont été supprimées.",
        "Impossible de purger les notifications lues."
      );
    } catch {
      setFeedback({ tone: "error", text: "Impossible de purger les notifications lues." });
    }
  }, [mutateNotifications]);

  const purgeAll = useCallback(async () => {
    const confirmed = window.confirm(
      "Tout supprimer ? Cette action est irréversible (notifications lues et non lues)."
    );
    if (!confirmed) return;
    try {
      await mutateNotifications(
        () =>
          fetch("/api/notifications", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ all: true }),
          }),
        "Toutes les notifications ont été supprimées.",
        "Impossible de supprimer toutes les notifications."
      );
    } catch {
      setFeedback({ tone: "error", text: "Impossible de supprimer toutes les notifications." });
    }
  }, [mutateNotifications]);

  const hasUnread = unreadCount > 0;
  const groupedItems = useMemo(() => {
    const map = new Map<string, NotificationItem[]>();
    for (const item of items) {
      const key = getDayLabel(item.createdAt);
      const previous = map.get(key) ?? [];
      previous.push(item);
      map.set(key, previous);
    }
    return Array.from(map.entries());
  }, [items]);

  return (
    <section className={`border-rer-border bg-white shadow-sm ${isPopover ? "" : "rounded-2xl border"}`}>
      <header
        className={`flex flex-col gap-4 border-rer-border px-4 py-4 ${
          isPopover ? "border-b bg-gradient-to-b from-rer-app/50 to-transparent" : "border-b"
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className={`${isPopover ? "text-base" : "text-lg"} font-semibold text-rer-text`}>
              {isPopover ? "Notifications" : "Centre de notifications"}
            </h2>
            <p className="mt-0.5 text-sm text-rer-muted">
              {unreadCount} non lue{unreadCount > 1 ? "s" : ""} à traiter sur {totalCount}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2" aria-label="Actions globales notifications">
            <button
              type="button"
              onClick={markAllAsRead}
              disabled={!hasUnread || loading}
              className={actionButtonClass()}
            >
              Marquer tout comme lu
            </button>
            {!isPopover ? (
              <button
                type="button"
                onClick={() => void purgeRead()}
                disabled={loading}
                className={actionButtonClass()}
              >
                Supprimer les notifications lues
              </button>
            ) : null}
            {!isPopover ? (
              <button
                type="button"
                onClick={() => void purgeAll()}
                disabled={loading}
                className={actionButtonClass("danger")}
              >
                Vider le centre de notifications
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => void refresh()}
              disabled={loading}
              className={actionButtonClass()}
            >
              Actualiser
            </button>
            <Link
              href="/parametres/notifications"
              onClick={onNavigate}
              className={actionButtonClass()}
            >
              Gérer mes notifications
            </Link>
            {isPopover ? (
              <Link href="/notifications" onClick={onNavigate} className={actionButtonClass()}>
                Voir tout
              </Link>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filtrer par statut">
          <span className="text-xs font-medium uppercase tracking-wide text-rer-subtle">Statut</span>
          {(["all", "unread", "read"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setStatusFilter(value)}
              className={buttonBaseClass(statusFilter === value)}
              aria-pressed={statusFilter === value}
            >
              {value === "all" ? "Toutes" : value === "unread" ? "Non lues" : "Lues"}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filtrer par origine">
          <span className="text-xs font-medium uppercase tracking-wide text-rer-subtle">Origine</span>
          {(["all", "adminArticles", "authorActions"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setScopeFilter(value)}
              className={buttonBaseClass(scopeFilter === value)}
              aria-pressed={scopeFilter === value}
            >
              {value === "all"
                ? "Toutes"
                : value === "adminArticles"
                  ? "Mes articles (que j'ai publies/modifies)"
                  : "Articles des auteurs"}
            </button>
          ))}
        </div>
      </header>

      <div className={`space-y-3 p-4 ${isPopover ? "max-h-[70vh] overflow-y-auto overscroll-contain pr-2" : ""}`}>
        {feedback ? (
          <p
            role="status"
            aria-live="polite"
            className={`rounded-lg p-2 text-sm ${
              feedback.tone === "success"
                ? "border border-green-200 bg-green-50 text-green-700"
                : "border border-red-200 bg-red-50 text-red-700"
            }`}
          >
            {feedback.text}
          </p>
        ) : null}
        {error && (
          <p role="alert" className="rounded-lg bg-red-50 p-2 text-sm text-red-700">
            {error}
          </p>
        )}
        {loading ? (
          <ul className="space-y-2" aria-label="Chargement des notifications">
            {Array.from({ length: 3 }).map((_, index) => (
              <li key={index} className="h-16 animate-pulse rounded-xl border border-rer-border bg-rer-app/70" />
            ))}
          </ul>
        ) : null}

        {!loading && items.length === 0 ? (
          <p className="rounded-lg border border-dashed border-rer-border p-6 text-sm text-rer-muted">
            {statusFilter === "unread"
              ? "Aucune notification non lue pour cette vue."
              : "Aucune notification disponible pour cette vue."}
          </p>
        ) : null}

        <div className="space-y-4">
          {groupedItems.map(([dayLabel, dayItems]) => (
            <section key={dayLabel} className="space-y-2">
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-rer-subtle">
                {dayLabel}
              </h3>
              <ul className="space-y-2">
                {dayItems.map((item) => {
                  const isRead = !!item.readAt;
                  const scope = getNotificationScope(item);
                  const articleHref = getArticleHref(item.metadata);
                  const scopeBadgeClass =
                    scope === "adminArticles"
                      ? "bg-blue-100 text-blue-700"
                      : "bg-violet-100 text-violet-700";

                  return (
                    <li
                      key={item.id}
                      className={`rounded-xl border px-3 py-2 transition-all duration-150 ${
                        isRead
                          ? "border-rer-border bg-white hover:border-rer-border/80 hover:bg-rer-app/30"
                          : "border-rer-blue/30 bg-rer-blue/5 shadow-[inset_0_0_0_1px_rgba(33,85,163,0.04)] hover:border-rer-blue/40"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${scopeBadgeClass}`}>
                              {scope === "adminArticles"
                                ? "Mes articles (que j&apos;ai publies/modifies)"
                                : "Articles des auteurs"}
                            </span>
                            {!isRead ? (
                              <span className="h-2 w-2 rounded-full bg-rer-blue" aria-label="Notification non lue" />
                            ) : null}
                            <span className="text-xs text-rer-subtle">{formatDate(item.createdAt)}</span>
                          </div>
                          <p className="truncate text-sm font-semibold leading-5 text-rer-text">{item.title}</p>
                          <p className="line-clamp-2 text-sm leading-5 text-rer-muted">{item.body}</p>
                          {articleHref ? (
                            <Link
                              href={articleHref}
                              className="inline-flex text-xs font-medium text-rer-blue hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rer-blue focus-visible:ring-offset-2"
                            >
                              Ouvrir l&apos;article
                            </Link>
                          ) : null}
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5">
                          {!isRead ? (
                            <button
                              type="button"
                              onClick={() => void markAsRead(item.id)}
                              className="rounded-md border border-rer-border px-2 py-1 text-xs font-medium text-rer-text transition-colors hover:border-rer-blue/40 hover:bg-rer-app focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rer-blue focus-visible:ring-offset-2"
                            >
                              Marquer comme lue
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => void markAsUnread(item.id)}
                              className="rounded-md border border-rer-border px-2 py-1 text-xs font-medium text-rer-text transition-colors hover:border-rer-blue/40 hover:bg-rer-app focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rer-blue focus-visible:ring-offset-2"
                            >
                              Marquer comme non lue
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => void deleteOne(item.id)}
                            className="rounded-md border border-rer-border px-2 py-1 text-xs font-medium text-rer-text transition-colors hover:border-red-200 hover:bg-red-50/70 hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rer-blue focus-visible:ring-offset-2"
                          >
                            Retirer
                          </button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>

        <footer className="flex items-center justify-between border-t border-rer-border pt-3 text-xs text-rer-muted">
          <span>{items.length} affichée(s) sur {totalCount}</span>
          <button
            type="button"
            onClick={() => void loadMore()}
            disabled={!hasMore || loadingMore}
            className="rounded-md border border-rer-border px-2.5 py-1.5 text-xs font-medium text-rer-text transition-colors hover:bg-rer-app focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rer-blue focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loadingMore ? "Chargement..." : hasMore ? "Afficher plus" : "Aucune autre notification"}
          </button>
        </footer>
      </div>
    </section>
  );
}
