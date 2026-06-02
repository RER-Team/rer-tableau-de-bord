 "use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ArticleReadSidePanel } from "@/app/articles/ArticleReadSidePanel";
import { ArticlesEmptyState } from "@/app/articles/ArticlesEmptyState";
import { useArticleShortcuts } from "@/app/articles/useArticleShortcuts";
import { getArticleStatusLabel } from "@/lib/article-status";
import {
  getFormatBadgeClasses,
  getRubriqueBadgeClasses,
} from "@/app/articles/ArticlesCardsExplorer";

type ArticleSummary = {
  id: string;
  titre: string;
  chapo: string | null;
  lienPhoto: string | null;
  legendePhoto: string | null;
  auteur: { prenom: string; nom: string } | null;
  mutuelle: { nom: string } | null;
  rubrique: { libelle: string } | null;
  format: { libelle: string } | null;
  etat: { libelle: string; slug: string } | null;
  dateDepot: string | null;
  datePublication: string | null;
  createdAt: string;
};

type ArticlesTableViewProps = {
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
  canOpenAdminEdit?: boolean;
};

export function ArticlesTableView({
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
  canOpenAdminEdit = false,
}: ArticlesTableViewProps) {
  const [articles, setArticles] = useState<ArticleSummary[]>(initialArticles);
  const [hasMore, setHasMore] = useState(initialArticles.length < total);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState(false);
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

  const handleExportWord = (id: string) => {
    window.open(`/api/articles/${id}/export?format=word`, "_blank");
  };

  useArticleShortcuts({
    articles,
    selectedId: selectedArticleId,
    onSelect: (id) => {
      setSelectedArticleId(id);
      setPanelOpen(false);
    },
    onOpenFull: (id) => {
      setSelectedArticleId(id);
      openArticlePanel(id);
    },
    onExportWord: handleExportWord,
  });

  // Réinitialiser la liste et la pagination quand les filtres / la recherche changent
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
    setLoadError(false);
    const nextPage = currentPageRef.current + 1;
    try {
      const res = await fetch(buildUrl(nextPage));
      if (!res.ok) {
        setLoadError(true);
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
      setLoadError(true);
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
    return <ArticlesEmptyState />;
  }

  return (
    <>
      <div className="overflow-x-auto" aria-keyshortcuts="ArrowUp ArrowDown Enter">
        <table className="w-full table-fixed divide-y divide-rer-border bg-white shadow-sm ring-1 ring-rer-border">
          <thead className="bg-rer-blue text-white">
            <tr>
              <th className="w-20 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-white/90">
                Photo
              </th>
              <th className="w-[25%] px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-white/90">
                Titre
              </th>
              <th className="w-[13%] px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-white/90">
                Auteur
              </th>
              <th className="w-[12%] px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-white/90">
                Mutuelle
              </th>
              <th className="w-[10%] px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-white/90">
                Rubrique
              </th>
              <th className="w-[10%] px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-white/90">
                Format
              </th>
              <th className="w-28 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-white/90">
                Publié le
              </th>
              <th className="w-[9%] px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-white/90">
                État
              </th>
              <th className="w-24 px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-white/90">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-rer-border">
            {articles.map((article) => {
              const isSelected = article.id === selectedArticleId;
              const dateIso =
                article.datePublication ??
                article.dateDepot ??
                article.createdAt;
              return (
              <tr
                key={article.id}
                className={`hover:bg-rer-app ${
                  isSelected ? "bg-rer-blue/5 ring-1 ring-inset ring-rer-blue/30" : ""
                }`}
              >
                <td className="px-3 py-2 align-top">
                  {article.lienPhoto ? (
                    <div className="relative h-14 w-14 overflow-hidden rounded-lg border border-rer-border bg-rer-app">
                      <Image
                        src={article.lienPhoto}
                        alt={article.legendePhoto || article.titre}
                        fill
                        sizes="56px"
                        className="object-cover object-top"
                      />
                    </div>
                  ) : (
                    <div className="h-14 w-14 rounded-lg border border-dashed border-rer-border bg-rer-app" />
                  )}
                </td>
                <td className="px-3 py-2 align-top text-sm text-rer-text">
                  <button
                    type="button"
                    onClick={() => openArticlePanel(article.id)}
                    className="font-semibold text-left text-rer-blue hover:underline"
                  >
                    {article.titre}
                  </button>
                  {article.chapo && (
                    <p className="mt-0.5 line-clamp-2 text-xs text-rer-muted">
                      {article.chapo}
                    </p>
                  )}
                </td>
                <td className="px-3 py-2 text-sm text-rer-muted">
                  {article.auteur
                    ? `${article.auteur.prenom} ${article.auteur.nom}`
                    : "—"}
                </td>
                <td className="px-3 py-2 text-sm text-rer-muted">
                  {article.mutuelle?.nom || "—"}
                </td>
                <td className="px-3 py-2 text-sm">
                  {article.rubrique?.libelle ? (
                    <span
                      className={getRubriqueBadgeClasses(
                        article.rubrique.libelle
                      )}
                    >
                      {article.rubrique.libelle}
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-3 py-2 text-sm">
                  {article.format?.libelle ? (
                    <span
                      className={getFormatBadgeClasses(article.format.libelle)}
                    >
                      {article.format.libelle}
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-3 py-2 text-sm tabular-nums text-rer-subtle">
                  {dateIso
                    ? new Date(dateIso).toLocaleDateString("fr-FR")
                    : "—"}
                </td>
                <td className="px-3 py-2 text-sm text-rer-muted">
                  {article.etat
                    ? getArticleStatusLabel(
                        article.etat.slug,
                        mine === "1" ? "author" : "public"
                      ) ?? article.etat.libelle
                    : "—"}
                </td>
                <td className="px-3 py-2 text-right text-sm">
                  <button
                    type="button"
                    onClick={() => openArticlePanel(article.id)}
                    className="btn-action"
                  >
                    Voir
                  </button>
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div ref={sentinelRef} className="h-8">
        {loadError && (
          <div className="mt-3 text-center">
            <p className="text-xs text-red-600">
              Impossible de charger la suite de la liste.
            </p>
            <button
              type="button"
              onClick={() => void loadMore()}
              className="btn-action mt-2 text-xs"
            >
              Réessayer
            </button>
          </div>
        )}
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
        canOpenAdminEdit={canOpenAdminEdit}
      />
    </>
  );
}

