 "use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";

export function AppMainNav() {
  const pathname = usePathname();
  const { data: session } = useSession();

  const isOnArticles = pathname.startsWith("/articles");
  const isOnMesArticles = pathname.startsWith("/mes-articles");
  const isOnAdmin =
    pathname.startsWith("/admin") || pathname.startsWith("/relecteurs");

  const role = (session?.user as { role?: string } | undefined)?.role;
  const canSeeAdmin = role === "admin" || role === "relecteur";

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
        Articles
      </Link>
      <Link
        href="/mes-articles"
        className={`${baseClasses} ${
          isOnMesArticles ? activeClasses : inactiveClasses
        }`}
      >
        Mes articles
      </Link>
      {canSeeAdmin && (
        <Link
          href="/admin"
          className={`${baseClasses} ${
            isOnAdmin ? activeClasses : inactiveClasses
          }`}
        >
          Admin
        </Link>
      )}
    </nav>
  );
}

