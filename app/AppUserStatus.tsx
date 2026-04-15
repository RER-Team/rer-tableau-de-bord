"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { AppNotificationsBell } from "./AppNotificationsBell";

export function AppUserStatus() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const isOnPreferences = pathname.startsWith("/parametres");
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
      <AppNotificationsBell />
      <Link
        href="/parametres/notifications"
        className={`rounded-lg border px-2 py-0.5 text-[11px] font-medium transition-colors ${
          isOnPreferences
            ? "border-rer-blue bg-rer-blue text-white"
            : "border-rer-border bg-white text-rer-muted hover:bg-rer-app/60"
        }`}
        title="Préférences notifications"
      >
        Préférences
      </Link>
      <span className="hidden sm:inline">
        {session.user.email} · rôle {session.user.role}
      </span>

      <button
        type="button"
        onClick={() => signOut({ callbackUrl: "/" })}
        className="rounded-lg border border-rer-border bg-white px-2 py-0.5 text-[11px] font-medium text-rer-muted hover:bg-rer-app/60"
      >
        Se déconnecter
      </button>
    </div>
  );
}

