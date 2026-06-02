"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

type ArticlesEmptyStateProps = {
  /** Afficher le lien de réinitialisation (filtres ou recherche actifs). */
  showReset?: boolean;
  className?: string;
};

export function ArticlesEmptyState({
  showReset = true,
  className = "",
}: ArticlesEmptyStateProps) {
  const searchParams = useSearchParams();
  const view = searchParams.get("view");
  const resetHref = view ? `/articles?view=${encodeURIComponent(view)}` : "/articles";

  return (
    <div
      className={`rounded-lg bg-white px-4 py-8 text-center shadow-sm ring-1 ring-rer-border ${className}`}
      role="status"
    >
      <p className="text-sm font-medium text-rer-text">Aucun contenu trouvé</p>
      <p className="mt-1 text-sm text-rer-muted">
        Aucun article ne correspond à ces critères. Essayez d&apos;élargir votre
        recherche ou de modifier les filtres.
      </p>
      {showReset && (
        <Link
          href={resetHref}
          className="btn-action mt-4 inline-flex text-xs"
        >
          Réinitialiser les filtres
        </Link>
      )}
    </div>
  );
}
