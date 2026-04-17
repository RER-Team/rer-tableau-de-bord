"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams, useSearchParams } from "next/navigation";
import { getArticleStatusLabel } from "@/lib/article-status";
import {
  getEtatBadgeClasses,
  getFormatBadgeClasses,
  getRubriqueBadgeClasses,
} from "../ArticlesCardsExplorer";

type Article = {
  id: string;
  titre: string;
  chapo: string | null;
  contenu: string;
  lienPhoto: string | null;
  legendePhoto: string | null;
  creditPhoto: string | null;
  postRs: string | null;
  dateDepot: string | null;
  datePublication: string | null;
  createdAt: string;
  auteur: { prenom: string; nom: string };
  mutuelle: { nom: string } | null;
  rubrique: { libelle: string } | null;
  format: { libelle: string } | null;
  etat: { libelle: string; slug: string } | null;
};

function getFormatLabelWithIcon(libelle?: string | null): string {
  if (!libelle) return "";
  const key = libelle.toLowerCase();
  if (key.includes("podcast")) return `🎙 ${libelle}`;
  if (key.includes("vidéo") || key.includes("video")) return `🎬 ${libelle}`;
  return libelle;
}

type Session = { user?: { role?: string } } | null;

function transformEmbeds(html: string): string {
  if (typeof window === "undefined" || !html) return html;
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    const blocks = doc.querySelectorAll("figure.embed-block .embed-url");
    blocks.forEach((p) => {
      const figure = p.closest("figure.embed-block");
      if (!figure) return;
      const raw = p.textContent ?? "";
      const url = raw.trim();
      if (!url) return;

      let iframeSrc: string | null = null;
      let title = "Contenu embarqué";

      try {
        const parsed = new URL(url);
        const host = parsed.hostname.toLowerCase();

        // YouTube
        if (host.includes("youtube.com") || host === "youtu.be") {
          let videoId = "";
          if (host === "youtu.be") {
            videoId = parsed.pathname.replace("/", "").split(/[/?#&]/)[0] ?? "";
          } else {
            videoId =
              parsed.searchParams.get("v") ||
              parsed.pathname.split("/").filter(Boolean).pop() ||
              "";
          }
          if (videoId) {
            iframeSrc = `https://www.youtube.com/embed/${videoId}`;
            title = "Vidéo YouTube";
          }
        }

        // Datawrapper
        if (!iframeSrc && host.includes("datawrapper.dwcdn.net")) {
          const parts = parsed.pathname.split("/").filter(Boolean);
          const slug = parts.slice(0, 2).join("/") || "";
          if (slug) {
            iframeSrc = `https://datawrapper.dwcdn.net/${slug}/`;
            title = "Graphique Datawrapper";
          }
        }
      } catch {
        // URL invalide : on laisse tel quel
      }

      if (!iframeSrc) {
        return;
      }

      figure.innerHTML = `
<div class="embed-responsive">
  <iframe src="${iframeSrc}" title="${title}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen loading="lazy"></iframe>
</div>
`.trim();
    });

    return doc.body.innerHTML;
  } catch {
    return html;
  }
}

export default function ArticleDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const searchParams = useSearchParams();
  const back = searchParams.get("back");
  const mine = searchParams.get("mine");
  const [article, setArticle] = useState<Article | null>(null);
  const [session, setSession] = useState<Session>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`/api/articles/${id}`).then((r) => (r.ok ? r.json() : null)),
      fetch("/api/auth/session").then((r) => r.json()),
    ])
      .then(([a, s]) => {
        setArticle(a ?? null);
        setSession(s ?? null);
      })
      .finally(() => setLoading(false));
  }, [id]);

  const canEdit =
    session?.user?.role === "admin" || session?.user?.role === "relecteur";

  const contenuHtml = useMemo(
    () => (article?.contenu ? transformEmbeds(article.contenu) : ""),
    [article?.contenu]
  );

  if (loading) return <div className="p-6">Chargement…</div>;
  if (!article) return <div className="p-6">Contenu introuvable.</div>;

  const metaRubriqueFormat =
    article.rubrique || article.format
      ? [
          article.rubrique?.libelle,
          article.format?.libelle,
        ]
          .filter(Boolean)
          .join(" · ")
      : null;

  const backHref =
    back === "mes-articles"
      ? "/mes-articles"
      : back === "admin"
      ? "/admin/articles"
      : "/articles";
  const backLabel =
    back === "mes-articles"
      ? "← Retour à mes contenus"
      : back === "admin"
      ? "← Retour à la file admin"
      : "← Retour à la liste";

  const explorerBack = back ?? "articles";
  const statusContext =
    mine === "1" || back === "mes-articles"
      ? "author"
      : back === "admin"
      ? "admin"
      : "public";

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-4 flex items-center justify-between gap-3">
        <Link
          href={backHref}
          className="text-sm font-medium text-rer-blue hover:underline"
        >
          {backLabel}
        </Link>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {canEdit && (
            <Link
              href={`/articles?view=explorer&article=${encodeURIComponent(
                id
              )}${
                explorerBack
                  ? `&back=${encodeURIComponent(explorerBack)}`
                  : ""
              }${mine === "1" ? "&mine=1" : ""}`}
              className="btn-action shadow-sm"
            >
              Corriger
            </Link>
          )}
          <a
            href={`/api/articles/${id}/export?format=txt`}
            className="inline-flex items-center rounded-lg border border-rer-border bg-white px-2 py-1 text-[11px] font-medium text-rer-text hover:bg-rer-app/60"
          >
            TXT
          </a>
          <a
            href={`/api/articles/${id}/export?format=html`}
            className="inline-flex items-center rounded-lg border border-rer-border bg-white px-2 py-1 text-[11px] font-medium text-rer-text hover:bg-rer-app/60"
          >
            HTML
          </a>
          <a
            href={`/api/articles/${id}/export?format=word`}
            className="inline-flex items-center rounded-lg border border-rer-border bg-white px-2 py-1 text-[11px] font-medium text-rer-text hover:bg-rer-app/60"
          >
            Word
          </a>
        </div>
      </div>

      <article className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-rer-border">
        <header className="mb-4 flex flex-wrap items-start justify-between gap-3 border-b border-rer-border pb-3">
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-rer-muted">
              {metaRubriqueFormat ?? "Contenu"}
            </p>
            <h1 className="text-2xl font-extrabold text-rer-text">
              {article.titre}
            </h1>
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
              {(() => {
                const d =
                  article.datePublication ??
                  article.dateDepot ??
                  article.createdAt;
                if (!d) return null;
                return (
                  <span>
                    {" · Publié le "}
                    {new Date(d).toLocaleDateString("fr-FR")}
                  </span>
                );
              })()}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1 text-xs">
            <div className="flex flex-wrap items-center gap-1">
              {article.format && (
                <span
                  className={getFormatBadgeClasses(article.format.libelle)}
                >
                  {getFormatLabelWithIcon(article.format.libelle)}
                </span>
              )}
              {article.rubrique && (
                <span
                  className={getRubriqueBadgeClasses(
                    article.rubrique.libelle
                  )}
                >
                  {article.rubrique.libelle}
                </span>
              )}
            </div>
          </div>
        </header>

        <div className="space-y-5 text-sm text-rer-text">
          {article.lienPhoto && (
            <div className="space-y-2">
              <div className="overflow-hidden rounded-lg border border-rer-border bg-rer-app">
                <Image
                  src={article.lienPhoto}
                  alt={article.legendePhoto || article.titre}
                  width={1400}
                  height={900}
                  unoptimized
                  className="h-auto w-full max-h-96 object-cover object-top"
                />
              </div>
              {article.legendePhoto && (
                <p className="text-xs text-rer-muted">
                  {article.legendePhoto}
                </p>
              )}
              {article.creditPhoto && (
                <p className="photo-credit">{article.creditPhoto}</p>
              )}
            </div>
          )}

          {article.chapo && (
            <p className="whitespace-pre-wrap text-sm font-semibold text-rer-text">
              {article.chapo}
            </p>
          )}

          {article.contenu && (
            <div
              className="prose max-w-none text-sm text-rer-text prose-h2:text-2xl prose-h2:font-semibold prose-h3:text-xl prose-h3:font-semibold"
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
        </div>
      </article>
    </div>
  );
}
