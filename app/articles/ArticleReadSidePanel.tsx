"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { getArticleStatusLabel } from "@/lib/article-status";
import {
  getEtatBadgeClasses,
  getFormatBadgeClasses,
  getRubriqueBadgeClasses,
} from "@/app/articles/ArticlesCardsExplorer";
import { trackArticleConsultation } from "@/lib/track-article-consultation";
import { transformEmbeds } from "@/lib/article-html";

type ArticleDetail = {
  id: string;
  titre: string;
  chapo: string | null;
  contenu: string | null;
  lienPhoto: string | null;
  legendePhoto: string | null;
  creditPhoto: string | null;
  postRs: string | null;
  auteur: { prenom: string; nom: string } | null;
  mutuelle: { nom: string } | null;
  rubrique: { libelle: string } | null;
  format: { libelle: string } | null;
  etat: { libelle: string; slug: string } | null;
  lienGoogleDoc?: string | null;
};

function getFormatLabelWithIcon(libelle?: string | null): string {
  if (!libelle) return "";
  const key = libelle.toLowerCase();
  if (key.includes("podcast")) return `🎙 ${libelle}`;
  if (key.includes("vidéo") || key.includes("video")) return `🎬 ${libelle}`;
  return libelle;
}

type ArticleReadSidePanelProps = {
  articleId: string | null;
  open: boolean;
  onClose: () => void;
  /** Lien "Ouvrir en pleine page" : back param pour le retour (ex: articles, mes-articles). */
  backParam?: string;
  canOpenAdminEdit?: boolean;
  publicMode?: boolean;
};

export function ArticleReadSidePanel({
  articleId,
  open,
  onClose,
  backParam = "articles",
  canOpenAdminEdit = false,
  publicMode = false,
}: ArticleReadSidePanelProps) {
  const statusContext = backParam === "mes-articles" ? "author" : "public";
  const [article, setArticle] = useState<ArticleDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mainImageLayout, setMainImageLayout] = useState<"portrait" | "landscape">("landscape");

  useEffect(() => {
    if (!open || !articleId) return;
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    setArticle(null);
    fetch(
      `/api/articles/${articleId}?scope=${publicMode ? "public" : "preview"}`,
      {
      signal: controller.signal,
    }
    )
      .then((r) => {
        if (!r.ok) throw new Error("Contenu introuvable");
        return r.json();
      })
      .then((data: ArticleDetail) => {
        setArticle(data);
        setMainImageLayout("landscape");
        if (!publicMode) {
          trackArticleConsultation(data.id, "side-panel");
        }
      })
      .catch((e) => {
        if (controller.signal.aborted) return;
        setError(e.message ?? "Erreur de chargement");
      })
      .finally(() => {
        if (controller.signal.aborted) return;
        setLoading(false);
      });
    return () => {
      controller.abort();
    };
  }, [articleId, open, publicMode]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  const contenuHtml = useMemo(
    () => (article?.contenu ? transformEmbeds(article.contenu) : ""),
    [article?.contenu]
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div
        className="flex-1 bg-black/20"
        onClick={onClose}
        onKeyDown={(e) => e.key === "Enter" && onClose()}
        role="button"
        tabIndex={0}
        aria-label="Fermer le panneau"
      />
      <div
        className="flex h-full w-full flex-col bg-white shadow-xl ring-1 ring-rer-border sm:min-w-[560px] sm:w-[55%] sm:max-w-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-end gap-3 border-b border-rer-border px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-rer-border bg-white px-3 py-1.5 text-xs font-medium text-rer-muted hover:bg-rer-app"
          >
            Fermer
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {loading && (
            <p className="text-sm text-rer-muted">Chargement…</p>
          )}
          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          {!loading && !error && article && (
            <div className="space-y-4 text-sm text-rer-text">
              <header className="flex flex-wrap items-start justify-between gap-3 border-b border-rer-border pb-3">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {article.rubrique?.libelle && (
                      <span
                        className={getRubriqueBadgeClasses(
                          article.rubrique.libelle
                        )}
                      >
                        {article.rubrique.libelle}
                      </span>
                    )}
                    {article.format?.libelle && (
                      <span
                        className={getFormatBadgeClasses(
                          article.format.libelle
                        )}
                      >
                        {getFormatLabelWithIcon(article.format.libelle)}
                      </span>
                    )}
                    {!article.rubrique?.libelle &&
                      !article.format?.libelle && (
                        <span className="text-xs text-rer-muted">Contenu</span>
                      )}
                  </div>
                  <h2 className="text-xl font-semibold text-rer-text">
                    {article.titre}
                  </h2>
                  <p className="text-xs text-rer-muted">
                    {article.etat && (
                      <span
                        className={getEtatBadgeClasses(article.etat.slug, false)}
                      >
                        {getArticleStatusLabel(article.etat.slug, statusContext) ??
                          article.etat.libelle}
                      </span>
                    )}
                    {article.auteur &&
                      ` ${article.auteur.prenom} ${article.auteur.nom}`}
                    {article.mutuelle && ` · ${article.mutuelle.nom}`}
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2 text-xs">
                  <a
                    href={`/api/articles/${article.id}/export?format=txt`}
                    className="inline-flex items-center rounded-lg border border-rer-border bg-white px-2 py-1 text-[11px] font-medium text-rer-text hover:bg-rer-app/60"
                  >
                    Export TXT
                  </a>
                  <a
                    href={`/api/articles/${article.id}/export?format=html`}
                    className="inline-flex items-center rounded-lg border border-rer-border bg-white px-2 py-1 text-[11px] font-medium text-rer-text hover:bg-rer-app/60"
                  >
                    Export HTML
                  </a>
                  <a
                    href={`/api/articles/${article.id}/export?format=word`}
                    className="inline-flex items-center rounded-lg border border-rer-border bg-white px-2 py-1 text-[11px] font-medium text-rer-text hover:bg-rer-app/60"
                  >
                    Exporter Word
                  </a>
                </div>
              </header>

              {article.lienPhoto && (
                <div className="space-y-2">
                  <div className="overflow-hidden rounded-lg border border-rer-border bg-rer-app">
                    <Image
                      src={article.lienPhoto}
                      alt={article.legendePhoto || article.titre}
                      width={1200}
                      height={700}
                      priority
                      sizes="(max-width: 1024px) 100vw, 720px"
                      onLoad={(e) => {
                        const img = e.currentTarget;
                        setMainImageLayout(
                          img.naturalHeight > img.naturalWidth ? "portrait" : "landscape"
                        );
                      }}
                      className={
                        mainImageLayout === "portrait"
                          ? "h-auto w-full max-h-[32rem] object-contain"
                          : "h-auto w-full max-h-80 object-cover object-top"
                      }
                    />
                  </div>
                  {article.legendePhoto && (
                    <p className="text-xs text-rer-muted">{article.legendePhoto}</p>
                  )}
                  {article.creditPhoto && (
                    <p className="photo-credit">{article.creditPhoto}</p>
                  )}
                </div>
              )}

              {article.chapo && (
                <p className="whitespace-pre-wrap font-semibold text-rer-text">
                  {article.chapo}
                </p>
              )}

              {article.contenu && (
                <div
                  className="prose max-w-none text-sm prose-h2:text-xl prose-h3:text-lg"
                  dangerouslySetInnerHTML={{ __html: contenuHtml }}
                />
              )}

              {article.postRs && (
                <div className="rounded-lg bg-rer-app p-3">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-rer-muted">
                    Post réseaux sociaux
                  </p>
                  <p className="whitespace-pre-wrap text-sm text-rer-text">
                    {article.postRs}
                  </p>
                </div>
              )}

              {article.lienGoogleDoc && (
                <a
                  href={article.lienGoogleDoc}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center rounded-lg border border-rer-border bg-rer-app px-3 py-1.5 text-xs font-medium text-rer-text hover:bg-white"
                >
                  Ouvrir le fichier source
                </a>
              )}

              <div className="flex flex-wrap items-center gap-2 pt-2">
                {canOpenAdminEdit && (
                  <Link
                    href={`/admin/articles?article=${article.id}`}
                    className="inline-flex items-center rounded-lg border border-rer-border bg-white px-3 py-1.5 text-xs font-medium text-rer-text hover:bg-rer-app"
                  >
                    Modifier (admin)
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
