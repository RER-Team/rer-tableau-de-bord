"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

type NavItem = {
  href?: string;
  label: string;
  description?: string;
  comingSoon?: boolean;
  adminOnly?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  {
    href: "/admin/utilisateurs",
    label: "Utilisateurs",
    description: "Rôles et rattachements",
    adminOnly: true,
  },
  {
    href: "/admin/referentiels",
    label: "Référentiels",
    description: "Formats, rubriques, mutuelles, auteurs",
    adminOnly: true,
  },
  {
    href: "/admin/emails",
    label: "Emails",
    description: "Templates notifications",
    adminOnly: true,
  },
];

export function RelecteursSidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const role = (session?.user as { role?: string } | undefined)?.role;
  const visibleNavItems = NAV_ITEMS.filter((item) => !item.adminOnly || role === "admin");

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const containerBase =
    "flex min-h-screen flex-col border-r border-rer-border bg-white/95 px-2 py-3";
  const containerWidth = collapsed ? "lg:w-16 lg:items-center" : "lg:w-64";
  const mobileVisibility = mobileOpen ? "translate-x-0" : "-translate-x-full";
  const showLabels = mobileOpen || !collapsed;

  return (
    <>
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className={`fixed bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] left-3 z-30 inline-flex h-10 w-10 items-center justify-center rounded-full border border-rer-border bg-white text-base font-semibold text-rer-text shadow-sm hover:bg-rer-app lg:hidden ${
          mobileOpen ? "hidden" : ""
        }`}
        aria-label="Ouvrir le menu admin"
        aria-expanded={mobileOpen}
      >
        ☰
        <span className="sr-only">Menu admin</span>
      </button>

      {mobileOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-slate-950/40 lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-label="Fermer le menu admin"
        />
      )}

      <aside
        className={`${containerBase} ${containerWidth} ${mobileVisibility} fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-200 lg:static lg:z-auto lg:w-auto lg:translate-x-0`}
      >
        <button
          type="button"
          onClick={() => {
            if (mobileOpen) {
              setMobileOpen(false);
              return;
            }
            setCollapsed((prev) => !prev);
          }}
          className="mb-1 inline-flex h-8 w-8 items-center justify-center rounded-full border border-rer-border bg-rer-app text-xs font-medium text-rer-muted hover:bg-white"
          aria-label={
            mobileOpen
              ? "Fermer le menu"
              : collapsed
                ? "Déplier le menu"
                : "Replier le menu"
          }
        >
          {mobileOpen ? "×" : collapsed ? "»" : "«"}
        </button>

        <div className="flex-1 space-y-1">
          {visibleNavItems.map((item) => {
            const isActive =
              item.href && pathname === item.href.replace(/\?.*$/, "");
            const baseClasses =
              "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs transition-colors";

            if (item.comingSoon) {
              return (
                <div
                  key={item.label}
                  className={`${baseClasses} cursor-not-allowed text-rer-muted`}
                  aria-disabled="true"
                  title="Bientôt disponible"
                >
                  <div className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-rer-app text-[11px] font-semibold text-rer-muted">
                    {item.label.charAt(0)}
                  </div>
                  {showLabels && (
                    <div className="flex flex-col">
                      <span className="font-medium">{item.label}</span>
                      {item.description && (
                        <span className="text-[11px] text-rer-subtle">
                          {item.description}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            }

            const href = item.href ?? "#";
            const activeClasses = isActive
              ? "bg-rer-blue text-white shadow-sm"
              : "text-rer-text hover:bg-rer-app";

            return (
              <Link
                key={item.label}
                href={href}
                onClick={() => setMobileOpen(false)}
                className={`${baseClasses} ${activeClasses}`}
              >
                <div className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-white/70 text-[11px] font-semibold text-rer-blue">
                  {item.label.charAt(0)}
                </div>
                {showLabels && (
                  <div className="flex flex-col">
                    <span className="font-medium">{item.label}</span>
                    {item.description && (
                      <span className="text-[11px] text-rer-subtle">
                        {item.description}
                      </span>
                    )}
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      </aside>
    </>
  );
}

