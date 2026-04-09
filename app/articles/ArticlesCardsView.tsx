 "use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ArticleReadSidePanel } from "@/app/articles/ArticleReadSidePanel";

type ArticleSummary = {
  id: string;
  titre: string;
  chapo: string | null;
  lienPhoto: string | null;
  legendePhoto: string | null;
  auteur: { prenom: string; nom: string } | null;
  mutuelle: { nom: string } | null;
  dateDepot: string | null;
  datePublication: string | null;
  createdAt: string;
};

type ArticlesCardsViewProps = {
  initialArticles: ArticleSummary[];
  total: number;
  initialPage: number;
  pageSize: number;
  q: string;
  etatSlug: string;
  mutuelleId: string;
  rubriqueId?: string;
  formatId?: string;
  since?: string;
  from?: string;
  to?: string;
  mine?: string;
};

export function ArticlesCardsView({
  initialArticles,
  total,
  initialPage,
  pageSize,
  q,
  etatSlug,
  mutuelleId,
  rubriqueId = "",
  formatId = "",
  since = "",
  from = "",
  to = "",
  mine = "",
}: ArticlesCardsViewProps) {
  const [articles, setArticles] = useState<ArticleSummary[]>(initialArticles);
  const [hasMore, setHasMore] = useState(initialArticles.length < total);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const currentPageRef = useRef(initialPage);

  const openArticlePanel = (id: string) => {
    setSelectedArticleId(id);
    setPanelOpen(true);
  };
  const closeArticlePanel = () => {
    setPanelOpen(false);
    setSelectedArticleId(null);
  };

  // Quand les filtres ou la recherche changent (et que le serveur renvoie un nouveau jeu initial),
  // on réinitialise la liste et la pagination client.
  useEffect(() => {
    setArticles(initialArticles);
    setHasMore(initialArticles.length < total);
    currentPageRef.current = initialPage;
  }, [initialArticles, total, initialPage]);

  const buildUrl = (page: number) => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", String(pageSize));
    if (mine !== "1") params.set("scope", "public");
    if (q) params.set("q", q);
    if (etatSlug) params.set("etat", etatSlug);
    if (mutuelleId) params.set("mutuelleId", mutuelleId);
    if (rubriqueId) params.set("rubriqueId", rubriqueId);
    if (formatId) params.set("formatId", formatId);
    if (since) params.set("since", since);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    if (mine === "1") params.set("mine", "1");
    return `/api/articles?${params.toString()}`;
  };

  const loadMore = async () => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    const nextPage = currentPageRef.current + 1;
    try {
      const res = await fetch(buildUrl(nextPage));
      if (!res.ok) {
        setHasMore(false);
        return;
      }
      const data = await res.json();
      const newArticles: ArticleSummary[] = data.articles ?? [];

      setArticles((prev) => {
        const existingIds = new Set(prev.map((a) => a.id));
        const merged = [
          ...prev,
          ...newArticles.filter((a) => !existingIds.has(a.id)),
        ];
        if (merged.length >= data.total) {
          setHasMore(false);
        }
        return merged;
      });
      currentPageRef.current = nextPage;
      if (!newArticles.length) {
        setHasMore(false);
      }
    } catch {
      setHasMore(false);
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    if (!hasMore) return;
    const node = sentinelRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first.isIntersecting) {
          loadMore();
        }
      },
      { rootMargin: "200px" }
    );

    observer.observe(node);
    return () => {
      observer.disconnect();
    };
  }, [hasMore, loadingMore]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!articles.length) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <p className="col-span-full rounded-lg bg-white px-3 py-6 text-center text-sm text-rer-muted shadow-sm ring-1 ring-rer-border">
          Aucun article ne correspond à ces critères. Essayez d&apos;élargir
          votre recherche ou de modifier les filtres.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {articles.map((article) => (
          <article
            key={article.id}
            role="button"
            tabIndex={0}
            onClick={() => openArticlePanel(article.id)}
            onKeyDown={(e) =>
              e.key === "Enter" && openArticlePanel(article.id)
            }
            className="flex h-full cursor-pointer flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-rer-border transition hover:ring-rer-blue/50 sm:flex-row"
          >
            <div className="relative h-40 w-full bg-rer-app sm:h-auto sm:w-40 sm:flex-none">
              {article.lienPhoto ? (
                <Image
                  src={article.lienPhoto}
                  alt={article.legendePhoto || article.titre}
                  fill
                  sizes="(max-width: 640px) 100vw, 160px"
                  unoptimized
                  className="object-cover object-top"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs text-rer-muted">
                  Pas de photo
                </div>
              )}
            </div>
            <div className="flex flex-1 flex-col gap-2 p-4">
              <span className="text-base font-semibold text-rer-text sm:text-lg">
                {article.titre}
              </span>
              {article.chapo && (
                <p className="line-clamp-2 text-sm text-rer-muted">
                  {article.chapo}
                </p>
              )}
              <p className="mt-auto text-xs text-rer-muted">
                {article.auteur &&
                  `${article.auteur.prenom} ${article.auteur.nom}`}
                {article.mutuelle && ` · ${article.mutuelle.nom}`}
                {(() => {
                  const d =
                    article.datePublication ??
                    article.dateDepot ??
                    article.createdAt;
                  return d
                    ? ` · Publié le ${new Date(
                        d
                      ).toLocaleDateString("fr-FR")}`
                    : "";
                })()}
              </p>
            </div>
          </article>
        ))}
      </div>

      <div ref={sentinelRef} className="h-8">
        {loadingMore && (
          <p className="mt-3 text-center text-xs text-slate-400">
            Chargement…
          </p>
        )}
        {!hasMore && articles.length < total && (
          <p className="mt-3 text-center text-xs text-slate-400">
            Tous les articles chargés.
          </p>
        )}
      </div>

      <ArticleReadSidePanel
        articleId={selectedArticleId}
        open={panelOpen}
        onClose={closeArticlePanel}
        backParam="articles"
      />
    </>
  );
}

