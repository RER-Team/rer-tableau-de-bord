"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { useState } from "react";
import {
  getEtatBadgeClasses,
  getFormatBadgeClasses,
  getRubriqueBadgeClasses,
} from "../articles/ArticlesCardsExplorer";
import { ArticleHistoryDrawer } from "./ArticleHistoryDrawer";
import { MesArticleSidePanel } from "./MesArticleSidePanel";

type MesArticleRow = {
  id: string;
  titre: string;
  chapo: string | null;
  lienPhoto: string | null;
  rubrique: string | null;
  format: string | null;
  mutuelle: string | null;
  etatLibelle: string | null;
  etatSlug: string | null;
  lastAction: string;
  lastActionAt: string | null;
  updatedAt: string;
  canEdit: boolean;
};

type MesArticlesTableProps = {
  articles: MesArticleRow[];
  total: number;
  pageSize: number;
  currentPage: number;
  totalPages: number;
};

export function MesArticlesTable({
  articles,
  total,
  pageSize,
  currentPage,
  totalPages,
}: MesArticlesTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyArticleId, setHistoryArticleId] = useState<string | null>(null);

  const [panelOpen, setPanelOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [panelMode, setPanelMode] = useState<"view" | "edit">("view");

  const openHistory = (articleId: string) => {
    setHistoryArticleId(articleId);
    setHistoryOpen(true);
  };

  const closeHistory = () => {
    setHistoryOpen(false);
    setHistoryArticleId(null);
  };

  const goToPage = (page: number) => {
    const safePage = Math.min(Math.max(page, 1), totalPages);
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(safePage));
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const [bulkMode, setBulkMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const exitBulkMode = () => {
    setBulkMode(false);
    setSelectedIds([]);
  };

  const handleEditClick = (article: MesArticleRow) => {
    setSelectedId(article.id);
    setPanelMode("edit");
    setPanelOpen(true);
  };

  const openPanelView = (articleId: string) => {
    setSelectedId(articleId);
    setPanelMode("view");
    setPanelOpen(true);
  };

  const openPanelEdit = (articleId: string) => {
    setSelectedId(articleId);
    setPanelMode("edit");
    setPanelOpen(true);
  };

  const closePanel = () => {
    setPanelOpen(false);
    setSelectedId(null);
  };

  const handleBulkDelete = async () => {
    if (!selectedIds.length) return;
    const confirmed = window.confirm(
      `Supprimer définitivement ${selectedIds.length} article(s) sélectionné(s) ?`
    );
    if (!confirmed) return;
    try {
      await Promise.all(
        selectedIds.map((id) =>
          fetch(`/api/articles/${id}`, { method: "DELETE" })
        )
      );
      exitBulkMode();
      router.refresh();
    } catch {
      alert("Erreur réseau lors de la suppression en masse.");
    }
  };

  const handleDeleteOne = async (article: MesArticleRow) => {
    const deletableStatuses = new Set(["brouillon", "a_relire"]);
    if (!article.etatSlug || !deletableStatuses.has(article.etatSlug)) return;
    const confirmed = window.confirm(
      `Supprimer définitivement « ${article.titre} » ?`
    );
    if (!confirmed) return;
    try {
      const res = await fetch(`/api/articles/${article.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        if (selectedId === article.id) closePanel();
        router.refresh();
      } else {
        alert("Impossible de supprimer l'article.");
      }
    } catch {
      alert("Erreur réseau lors de la suppression.");
    }
  };

  if (!articles.length) {
    return (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-rer-border bg-white shadow-sm ring-1 ring-rer-border">
          <tbody>
            <tr>
              <td className="px-3 py-6 text-center text-sm text-rer-muted">
                Vous n&apos;avez pas encore d&apos;article. Déposez un premier
                texte pour le retrouver ici.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <>
      <div className="mb-2 flex items-center justify-between text-xs text-rer-muted">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              if (bulkMode) {
                exitBulkMode();
              } else {
                setBulkMode(true);
              }
            }}
            className={`inline-flex items-center rounded-lg border px-3 py-1.5 text-[11px] font-medium ${
              bulkMode
                ? "border-rer-blue bg-rer-blue text-white"
                : "border-rer-border bg-white text-rer-text hover:bg-rer-app"
            }`}
          >
            Sélection multiple
          </button>
          {bulkMode && (
            <span className="text-[11px] text-rer-muted">
              {selectedIds.length
                ? `${selectedIds.length} article(s) sélectionné(s)`
                : "Cliquez sur le rond à gauche de chaque ligne"}
            </span>
          )}
        </div>
        {bulkMode && selectedIds.length > 0 && (
          <button
            type="button"
            onClick={handleBulkDelete}
            className="inline-flex items-center rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-[11px] font-medium text-red-600 hover:bg-red-100"
          >
            Supprimer la sélection ({selectedIds.length})
          </button>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-rer-border bg-white shadow-sm ring-1 ring-rer-border">
          <thead className="bg-rer-blue text-white">
            <tr>
              <th className="w-6 px-3 py-2" aria-hidden="true" />
              <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-white/90">
                Photo
              </th>
              <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-white/90">
                Titre
              </th>
              <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-white/90">
                Rubrique / Format
              </th>
              <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-white/90">
                État
              </th>
              <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-white/90">
                Dernière activité
              </th>
              <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-white/90">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-rer-border">
            {articles.map((article) => {
              const isSelected = selectedIds.includes(article.id);
              return (
                <tr
                  key={article.id}
                  onClick={() => {
                    if (bulkMode) {
                      toggleSelected(article.id);
                    }
                  }}
                  className={`hover:bg-rer-app ${
                    bulkMode && isSelected ? "bg-rer-blue/5" : ""
                  } ${bulkMode ? "cursor-pointer" : ""}`}
                >
                  <td className="px-3 py-2 align-top">
                    {bulkMode && (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          toggleSelected(article.id);
                        }}
                        className={`flex h-3.5 w-3.5 items-center justify-center rounded-full border ${
                          isSelected
                            ? "border-rer-blue bg-rer-blue"
                            : "border-rer-border bg-white hover:bg-rer-app"
                        }`}
                        aria-pressed={isSelected}
                        aria-label={
                          isSelected
                            ? "Désélectionner cet article"
                            : "Sélectionner cet article"
                        }
                      />
                    )}
                  </td>
                  <td className="px-3 py-2 align-top">
                    {article.lienPhoto ? (
                      <div className="relative h-14 w-14 overflow-hidden rounded-lg border border-rer-border bg-rer-app">
                        <Image
                          src={article.lienPhoto}
                          alt=""
                          fill
                          sizes="56px"
                          unoptimized
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
                      onClick={(event) => {
                        event.stopPropagation();
                        openPanelView(article.id);
                      }}
                      className="font-semibold text-rer-blue hover:underline text-left"
                    >
                      {article.titre}
                    </button>
                    {article.chapo && (
                      <p className="mt-0.5 line-clamp-2 text-xs text-rer-muted">
                        {article.chapo}
                      </p>
                    )}
                  </td>
                <td className="px-3 py-2 align-top text-xs">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span
                      className={getRubriqueBadgeClasses(article.rubrique ?? undefined)}
                    >
                      {article.rubrique ?? "—"}
                    </span>
                    <span
                      className={getFormatBadgeClasses(article.format ?? undefined)}
                    >
                      {article.format ?? "—"}
                    </span>
                  </div>
                </td>
                <td className="px-3 py-2 align-top text-sm">
                  {article.etatLibelle ? (
                    <span
                      className={`${getEtatBadgeClasses(
                        article.etatSlug ?? undefined
                      )} whitespace-nowrap`}
                    >
                      {article.etatLibelle}
                    </span>
                  ) : (
                    <span className="text-xs text-rer-muted">État inconnu</span>
                  )}
                </td>
                <td className="px-3 py-2 align-top text-xs text-rer-muted">
                  <div className="font-medium text-[11px] text-rer-text">
                    {article.lastAction}
                  </div>
                  {article.lastActionAt && (
                    <div className="text-[11px] text-rer-muted">
                      {new Date(article.lastActionAt).toLocaleString("fr-FR")}
                    </div>
                  )}
                </td>
                <td className="px-3 py-2 align-top text-right text-xs">
                  <div className="inline-flex flex-col items-end gap-1">
                    {article.etatSlug === "brouillon" ? (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          openPanelEdit(article.id);
                        }}
                        className="btn-action"
                      >
                        Continuer le brouillon
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          openPanelView(article.id);
                        }}
                        className="btn-action"
                      >
                        Voir l&apos;article
                      </button>
                    )}
                    {article.canEdit && article.etatSlug !== "brouillon" && (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleEditClick(article);
                        }}
                        className="btn-action-text"
                      >
                        Modifier
                      </button>
                    )}
                    {(article.etatSlug === "a_relire" || article.etatSlug === "brouillon") && (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleDeleteOne(article);
                        }}
                        className="btn-action-danger"
                      >
                        Supprimer
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        openHistory(article.id);
                      }}
                      className="btn-action-text"
                    >
                      Historique
                    </button>
                  </div>
                </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-rer-muted">
        <div>
          Page {currentPage} sur {totalPages} ·{" "}
          {total} article{total > 1 ? "s" : ""} (
          {pageSize} par page)
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage <= 1}
            className="rounded-lg border border-rer-border bg-white px-3 py-1.5 text-xs font-medium text-rer-muted disabled:opacity-50 hover:bg-rer-app disabled:hover:bg-white"
          >
            Précédent
          </button>
          <button
            type="button"
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className="rounded-lg border border-rer-border bg-white px-3 py-1.5 text-xs font-medium text-rer-muted disabled:opacity-50 hover:bg-rer-app disabled:hover:bg-white"
          >
            Suivant
          </button>
        </div>
      </div>

      <ArticleHistoryDrawer
        articleId={historyArticleId}
        open={historyOpen}
        onClose={closeHistory}
      />

      <MesArticleSidePanel
        articleId={selectedId}
        mode={panelMode}
        open={panelOpen}
        onClose={closePanel}
        onModeChange={setPanelMode}
      />
    </>
  );
}

