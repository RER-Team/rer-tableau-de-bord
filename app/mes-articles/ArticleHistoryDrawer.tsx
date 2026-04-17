"use client";

import { useEffect, useState } from "react";
import { getEtatBadgeClasses } from "../articles/ArticlesCardsExplorer";
import { getArticleStatusLabel } from "@/lib/article-status";

type ArticleHistoriqueItem = {
  id: string;
  createdAt: string;
  etat: { libelle: string; slug: string } | null;
  user: { email: string | null } | null;
  commentaire: string | null;
};

type ArticleDetail = {
  id: string;
  titre: string;
  chapo: string | null;
  contenu: string | null;
  lienGoogleDoc?: string | null;
  auteur: { prenom: string; nom: string } | null;
  mutuelle: { nom: string } | null;
  etat: { libelle: string; slug: string } | null;
  historiques: ArticleHistoriqueItem[];
};

type ArticleHistoryDrawerProps = {
  articleId: string | null;
  open: boolean;
  onClose: () => void;
};

function extractFirstParagraph(contenu: string | null): string | null {
  if (!contenu) return null;
  try {
    const withoutTags = contenu.replace(/<[^>]+>/g, " ");
    const normalized = withoutTags.replace(/\s+/g, " ").trim();
    if (!normalized) return null;
    const firstSentenceMatch = normalized.match(/^(.{0,280}?[\.\!\?])\s/);
    if (firstSentenceMatch?.[1]) {
      return firstSentenceMatch[1];
    }
    return normalized.slice(0, 280);
  } catch {
    return null;
  }
}

export function ArticleHistoryDrawer({
  articleId,
  open,
  onClose,
}: ArticleHistoryDrawerProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [article, setArticle] = useState<ArticleDetail | null>(null);

  useEffect(() => {
    if (!open || !articleId) {
      return;
    }

    let cancelled = false;
    const fetchArticle = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/articles/${articleId}`);
        if (!res.ok) {
          setError("Impossible de charger l’historique de ce contenu.");
          return;
        }
        const data = (await res.json()) as ArticleDetail;
        if (!cancelled) {
          setArticle(data);
        }
      } catch {
        if (!cancelled) {
          setError("Erreur réseau lors du chargement de l’historique.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchArticle();

    return () => {
      cancelled = true;
    };
  }, [articleId, open]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const firstParagraph = extractFirstParagraph(article?.contenu ?? null);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/20">
      <div className="h-full w-full max-w-md bg-white shadow-xl ring-1 ring-rer-border">
        <div className="flex items-start justify-between border-b border-rer-border px-4 py-3">
          <div className="space-y-1">
            <h2 className="text-sm font-semibold text-rer-text">
              Modifications &amp; suggestions
            </h2>
            {article && (
              <p className="text-xs text-rer-muted">{article.titre}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-rer-border bg-white px-2 py-1 text-xs font-medium text-rer-muted hover:bg-rer-app"
          >
            Fermer
          </button>
        </div>

        <div className="flex h-[calc(100%-52px)] flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
            {loading && (
              <p className="text-xs text-rer-muted">
                Chargement de l’historique…
              </p>
            )}

            {error && (
              <p className="text-xs text-red-600">
                {error}
              </p>
            )}

            {article && !loading && !error && (
              <>
                <section className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    {article.etat && (
                      <span
                        className={getEtatBadgeClasses(
                          article.etat.slug,
                          true
                        )}
                      >
                        {getArticleStatusLabel(article.etat.slug, "author") ??
                          article.etat.libelle}
                      </span>
                    )}
                    {article.mutuelle && (
                      <span className="inline-flex items-center rounded-lg bg-rer-app px-2 py-0.5 text-[11px] font-medium text-rer-muted">
                        {article.mutuelle.nom}
                      </span>
                    )}
                  </div>
                  {article.lienGoogleDoc && (
                    <a
                      href={article.lienGoogleDoc}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center rounded-lg border border-rer-border bg-rer-app px-3 py-1 text-[11px] font-medium text-rer-text hover:bg-white"
                    >
                      Ouvrir le fichier source
                    </a>
                  )}
                  {article.chapo && (
                    <p className="mt-1 text-xs text-rer-text">
                      {article.chapo}
                    </p>
                  )}
                  {firstParagraph && (
                    <p className="mt-1 text-xs text-rer-muted">
                      {firstParagraph}
                    </p>
                  )}
                </section>

                <section className="space-y-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-rer-muted">
                    Historique
                  </h3>
                  {article.historiques.length === 0 ? (
                    <p className="text-xs text-rer-muted">
                      Aucun historique disponible pour ce contenu.
                    </p>
                  ) : (
                    <ol className="space-y-2 text-xs text-rer-text">
                      {article.historiques.map((event) => (
                        <li
                          key={event.id}
                          className="rounded-lg border border-rer-border bg-rer-app/40 p-2"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="font-medium">
                              {event.etat
                                ? getArticleStatusLabel(
                                    event.etat.slug,
                                    "author"
                                  ) ?? event.etat.libelle
                                : "État mis à jour"}
                            </div>
                            <div className="text-[11px] text-rer-muted">
                              {new Date(event.createdAt).toLocaleString("fr-FR")}
                            </div>
                          </div>
                          <div className="mt-0.5 text-[11px] text-rer-muted">
                            {event.user?.email
                              ? `Par ${event.user.email}`
                              : "Auteur non renseigné"}
                          </div>
                          {event.commentaire && (
                            <p className="mt-1 text-xs text-rer-text">
                              {event.commentaire}
                            </p>
                          )}
                        </li>
                      ))}
                    </ol>
                  )}
                </section>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

