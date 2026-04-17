 "use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";

export function AppMainNav() {
  const pathname = usePathname();
  const { data: session } = useSession();

  const isOnArticles = pathname.startsWith("/articles");
  const isOnMesArticles = pathname.startsWith("/mes-articles");
  const isOnRelecture =
    pathname.startsWith("/admin/articles") || pathname.startsWith("/relecteurs");
  const isOnAdminConfig = pathname.startsWith("/admin") && !pathname.startsWith("/admin/articles");

  const role = (session?.user as { role?: string } | undefined)?.role;
  const canSeeRelecture = role === "admin" || role === "relecteur";
  const canSeeAdmin = role === "admin";

  const baseClasses =
    "inline-flex items-center rounded-full px-3 py-1 text-sm font-medium whitespace-nowrap transition-colors";
  const inactiveClasses =
    "text-rer-muted hover:text-rer-text hover:bg-rer-app";
  const activeClasses = "bg-rer-blue text-white shadow-sm";

  return (
    <nav className="flex flex-wrap items-center gap-2 text-sm lg:flex-nowrap">
      <Link
        href="/articles"
        className={`${baseClasses} ${
          isOnArticles && !isOnMesArticles ? activeClasses : inactiveClasses
        }`}
      >
        Contenus
      </Link>
      <Link
        href="/mes-articles"
        className={`${baseClasses} ${
          isOnMesArticles ? activeClasses : inactiveClasses
        }`}
      >
        Mes contenus
      </Link>
      {canSeeRelecture && (
        <Link
          href="/admin/articles"
          className={`${baseClasses} ${
            isOnRelecture ? activeClasses : inactiveClasses
          }`}
        >
          Relecture
        </Link>
      )}
      {canSeeAdmin && (
        <Link
          href="/admin/utilisateurs"
          className={`${baseClasses} ${
            isOnAdminConfig ? activeClasses : inactiveClasses
          }`}
        >
          Admin
        </Link>
      )}
    </nav>
  );
}

