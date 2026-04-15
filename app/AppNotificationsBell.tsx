"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type AppNotificationsBellProps = {
  isActive?: boolean;
};

export function AppNotificationsBell({ isActive = false }: AppNotificationsBellProps) {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let active = true;
    let timer: number | null = null;

    const refresh = async () => {
      try {
        const response = await fetch("/api/notifications?limit=1", { cache: "no-store" });
        if (!response.ok) return;
        const payload = (await response.json()) as { unreadCount?: number };
        if (active) {
          setUnreadCount(payload.unreadCount ?? 0);
        }
      } catch {
        // silencieux: l'icône reste sans badge en cas d'erreur réseau.
      } finally {
        if (active) {
          timer = window.setTimeout(refresh, 30000);
        }
      }
    };

    void refresh();

    return () => {
      active = false;
      if (timer) window.clearTimeout(timer);
    };
  }, []);

  return (
    <Link
      href="/notifications"
      className={`relative inline-flex h-12 w-12 items-center justify-center rounded-full border bg-white transition-colors ${
        isActive
          ? "border-rer-blue text-rer-blue"
          : "border-rer-border text-rer-muted hover:bg-rer-app/60 hover:text-rer-text"
      }`}
      aria-label="Ouvrir les notifications"
      title="Notifications"
    >
      <span aria-hidden className="text-base">
        🔔
      </span>
      {unreadCount > 0 ? (
        <span className="absolute -right-1 -top-1 inline-flex min-h-4 min-w-4 items-center justify-center rounded-full bg-rer-blue px-1 text-[10px] font-semibold text-white">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      ) : null}
    </Link>
  );
}
