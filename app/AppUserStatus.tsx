"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { AppNotificationsBell } from "./AppNotificationsBell";

export function AppUserStatus() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const menuButtonRef = useRef<HTMLButtonElement | null>(null);
  const firstMenuItemRef = useRef<HTMLAnchorElement | null>(null);
  const menuId = "account-menu";
  const isOnPreferences = pathname.startsWith("/parametres/notifications");
  const isOnProfile = pathname.startsWith("/mon-profil");
  const email = session?.user?.email ?? "";
  const role = session?.user?.role ?? "";
  const roleLabel =
    role === "admin" ? "Admin" : role === "relecteur" ? "Relecteur" : role === "auteur" ? "Auteur" : role;

  const accountLabel = useMemo(() => {
    const localPart = email.split("@")[0] ?? "";
    if (!localPart) return "Compte";
    return localPart.length > 14 ? `${localPart.slice(0, 14)}…` : localPart;
  }, [email]);

  useEffect(() => {
    if (!session?.user) return;
    fetch("/api/me/profile", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        setAvatarUrl(payload?.user?.avatarUrl || null);
      })
      .catch(() => {
        setAvatarUrl(null);
      });
  }, [session?.user?.email]);

  const avatarInitials = useMemo(() => {
    const localPart = email.split("@")[0] ?? "";
    const segments = localPart
      .split(/[.\-_]/)
      .map((segment) => segment.trim())
      .filter(Boolean);
    if (segments.length >= 2) {
      return `${segments[0][0]}${segments[1][0]}`.toUpperCase();
    }
    return (localPart.slice(0, 2) || "U").toUpperCase();
  }, [email]);

  useEffect(() => {
    if (!isMenuOpen) return;

    const handleOutsideClick = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMenuOpen(false);
      }
    };

    window.addEventListener("mousedown", handleOutsideClick);
    window.addEventListener("keydown", handleEscape);
    window.setTimeout(() => firstMenuItemRef.current?.focus(), 0);

    return () => {
      window.removeEventListener("mousedown", handleOutsideClick);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isMenuOpen]);

  const closeMenuAndReturnFocus = () => {
    setIsMenuOpen(false);
    window.setTimeout(() => menuButtonRef.current?.focus(), 0);
  };
  // On évite d'afficher le bloc sur la page login elle-même.
  if (pathname === "/login") return null;

  if (status === "loading") {
    return (
      <div className="text-[11px] text-rer-subtle">
        Vérification de la session…
      </div>
    );
  }

  if (!session?.user) {
    return (
      <Link
        href="/login"
        className="text-xs font-medium text-rer-blue hover:text-rer-text"
      >
        Se connecter
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-2 text-xs text-rer-muted">
      <AppNotificationsBell isActive={isOnNotifications} />

      <div className="relative" ref={menuRef}>
        <button
          ref={menuButtonRef}
          type="button"
          className={`inline-flex h-12 items-center gap-2 rounded-full border px-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rer-blue/40 sm:pr-3 ${
            isMenuOpen
              ? "border-rer-blue bg-rer-blue/5 text-rer-text"
              : "border-rer-border bg-white text-rer-muted hover:bg-rer-app/60"
          }`}
          aria-expanded={isMenuOpen}
          aria-haspopup="menu"
          aria-controls={menuId}
          aria-label="Ouvrir le menu compte"
          onClick={() => setIsMenuOpen((open) => !open)}
        >
          <span className="relative inline-flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-rer-blue/15 text-[11px] font-semibold text-rer-blue">
            {avatarUrl ? (
              <Image src={avatarUrl} alt="Avatar" fill className="object-cover" unoptimized />
            ) : (
              avatarInitials
            )}
          </span>
          <span className="hidden max-w-36 truncate text-xs font-medium text-rer-text sm:inline">
            {accountLabel}
          </span>
          <span aria-hidden className="hidden text-[10px] text-rer-subtle sm:inline">
            ▾
          </span>
        </button>

        {isMenuOpen ? (
          <div
            id={menuId}
            role="menu"
            aria-label="Menu compte"
            className="fixed inset-x-3 top-16 z-20 overflow-hidden rounded-2xl border border-rer-border bg-white shadow-lg transition duration-150 ease-out sm:absolute sm:right-0 sm:left-auto sm:top-full sm:mt-2 sm:w-72 sm:rounded-xl"
          >
            <div className="border-b border-rer-border/80 bg-rer-app/30 px-3 py-2.5">
              <p className="truncate text-sm font-semibold text-rer-text">{email}</p>
              <span className="mt-1 inline-flex rounded-full border border-rer-border bg-white px-2 py-0.5 text-[11px] font-medium text-rer-subtle">
                {roleLabel}
              </span>
            </div>

            <div className="p-1.5">
              <Link
                ref={firstMenuItemRef}
                href="/mon-profil"
                role="menuitem"
                className={`block rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                  isOnProfile
                    ? "bg-rer-blue text-white"
                    : "text-rer-muted hover:bg-rer-app/60 hover:text-rer-text"
                }`}
                onClick={() => closeMenuAndReturnFocus()}
              >
                Mon profil
              </Link>
              <Link
                href="/parametres/notifications"
                role="menuitem"
                className={`mt-1 block rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                  isOnPreferences
                    ? "bg-rer-blue text-white"
                    : "text-rer-muted hover:bg-rer-app/60 hover:text-rer-text"
                }`}
                onClick={() => closeMenuAndReturnFocus()}
              >
                Préférences notifications
              </Link>
            </div>

            <div className="border-t border-rer-border/80 p-1.5">
              <button
                type="button"
                role="menuitem"
                onClick={() => signOut({ callbackUrl: "/" })}
                className="block w-full rounded-lg px-3 py-2 text-left text-xs font-medium text-rer-muted transition-colors hover:bg-rer-app/60 hover:text-rer-text"
              >
                Se déconnecter
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

