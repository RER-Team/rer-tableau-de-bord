"use client";

import { type Ref, useEffect, useState } from "react";
import { subscribeToNotificationsUpdated } from "@/lib/notifications/client-sync";

type AppNotificationsBellProps = {
  isOpen: boolean;
  onToggle: () => void;
  isActive?: boolean;
  buttonRef?: Ref<HTMLButtonElement>;
};

export function AppNotificationsBell({
  isOpen,
  onToggle,
  isActive = false,
  buttonRef,
}: AppNotificationsBellProps) {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let active = true;
    let timer: number | null = null;

    const refresh = async () => {
      try {
        const response = await fetch("/api/notifications?take=1", { cache: "no-store" });
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
    const unsubscribe = subscribeToNotificationsUpdated((detail) => {
      if (typeof detail?.unreadCount === "number") {
        setUnreadCount(detail.unreadCount);
        return;
      }
      void refresh();
    });
    const onFocus = () => {
      void refresh();
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void refresh();
      }
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      active = false;
      unsubscribe();
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      if (timer) window.clearTimeout(timer);
    };
  }, []);

  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={onToggle}
      className={`relative inline-flex h-12 w-12 items-center justify-center rounded-full border bg-white transition-all duration-200 ${
        isOpen || isActive
          ? "border-rer-blue text-rer-blue shadow-[0_0_0_3px_rgba(33,85,163,0.12)]"
          : "border-rer-border text-rer-muted hover:-translate-y-0.5 hover:bg-rer-app/60 hover:text-rer-text"
      }`}
      aria-label={isOpen ? "Fermer les notifications" : "Ouvrir les notifications"}
      aria-expanded={isOpen}
      aria-haspopup="dialog"
      aria-controls="notifications-popover"
      title="Notifications"
    >
      <svg
        aria-hidden
        viewBox="0 0 24 24"
        fill={isOpen ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`h-5 w-5 transition-all duration-200 ${isOpen ? "scale-105 opacity-95" : ""}`}
      >
        <path d="M6 9a6 6 0 1 1 12 0c0 5 2 6 2 6H4s2-1 2-6" />
        <path d="M10.5 18a1.5 1.5 0 0 0 3 0" fill="none" />
      </svg>
      {unreadCount > 0 ? (
        <span className="absolute -right-1 -top-1 inline-flex min-h-4 min-w-4 items-center justify-center rounded-full bg-rer-blue px-1 text-[10px] font-semibold text-white ring-2 ring-white">
          {unreadCount > 99 ? "99+" : unreadCount}
        </span>
      ) : null}
    </button>
  );
}
