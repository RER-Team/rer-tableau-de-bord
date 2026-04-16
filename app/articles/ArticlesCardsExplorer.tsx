 "use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  getArticleStatusLabel,
  normalizeArticleStatusSlug,
} from "@/lib/article-status";
import { useArticleShortcuts } from "./useArticleShortcuts";

type ArticleSummary = {
  id: string;
  titre: string;
  chapo: string | null;
  lienPhoto: string | null;
  legendePhoto: string | null;
  creditPhoto: string | null;
  auteur: { prenom: string; nom: string } | null;
  mutuelle: { nom: string } | null;
  rubrique: { libelle: string } | null;
  format: { libelle: string } | null;
  etat: { libelle: string; slug: string } | null;
  dateDepot: string | null;
  datePublication: string | null;
  createdAt: string;
};

type ArticleDetail = {
  id: string;
  titre: string;
  chapo: string | null;
  contenu: string | null;
  lienPhoto: string | null;
  legendePhoto: string | null;
  creditPhoto: string | null;
  postRs: string | null;
  dateDepot: string | null;
  datePublication: string | null;
  createdAt: string;
  auteur: { prenom: string; nom: string } | null;
  mutuelle: { nom: string } | null;
  rubrique: { libelle: string } | null;
  format: { libelle: string } | null;
  etat: { libelle: string; slug: string } | null;
};

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

type ArticlesExplorerViewProps = {
  articles: ArticleSummary[];
  total: number;
  initialPage: number;
  pageSize: number;
  q: string;
  etatSlug: string;
  mutuelleId: string;
  rubriqueId?: string;
  formatId?: string;
  initialSelectedId?: string;
  since?: string;
  from?: string;
  to?: string;
  mine?: string;
  back?: string;
  showEtat: boolean;
  canOpenAdminEdit?: boolean;
};

export function getEtatBadgeClasses(slug?: string, active?: boolean): string {
  const base =
    "inline-flex items-center rounded-lg border px-2 py-0.5 text-[11px] font-medium";
  const normalizedSlug = normalizeArticleStatusSlug(slug);

  switch (normalizedSlug) {
    case "a_relire":
      return (
        base +
        " border-[#FACC15]/60 bg-[#FEF9C3] text-[#854D0E]" +
        (active ? " ring-1 ring-[#FACC15]/80" : "")
      );
    case "publie":
      return (
        base +
        " border-[#22C55E] bg-[#16A34A] text-white" +
        (active ? " ring-1 ring-[#4ADE80]" : "")
      );
    default:
      return (
        base +
        " border-rer-border bg-rer-app text-rer-muted" +
        (active ? " ring-1 ring-rer-border" : "")
      );
  }
}

/**
 * Format = badge outline (bordure + texte, fond léger).
 * Hiérarchie secondaire par rapport à la rubrique (plein).
 */
export function getFormatBadgeClasses(libelle?: string): string {
  const base =
    "inline-flex items-center rounded-lg border px-2 py-0.5 text-[11px] font-medium";
  if (!libelle) {
    return base + " border-rer-border bg-transparent text-rer-muted";
  }
  const key = libelle.toLowerCase();

  if (key.includes("brève")) {
    return base + " border-[#BE185D]/50 bg-[#FDF2F8]/50 text-[#BE185D]";
  }
  if (key.includes("dossier")) {
    return base + " border-[#4F46E5]/50 bg-[#EEF2FF]/50 text-[#4F46E5]";
  }
  if (key.includes("focus")) {
    return base + " border-[#92400E]/50 bg-[#FFFBEB]/50 text-[#92400E]";
  }
  if (key.includes("actus") || key.includes("actu")) {
    return base + " border-[#1D4ED8]/50 bg-[#EFF6FF]/50 text-[#1D4ED8]";
  }
  if (key.includes("podcast")) {
    return base + " border-[#7C3AED]/50 bg-[#F5F3FF]/70 text-[#6D28D9]";
  }
  if (key.includes("vidéo") || key.includes("video")) {
    return base + " border-[#DC2626]/50 bg-[#FEF2F2]/70 text-[#B91C1C]";
  }
  // Article ou autres formats
  return base + " border-[#6B7280]/40 bg-[#F3F4F6]/80 text-[#374151]";
}

function getFormatLabelWithIcon(libelle?: string | null): string {
  if (!libelle) return "";
  const key = libelle.toLowerCase();
  if (key.includes("podcast")) return `🎙 ${libelle}`;
  if (key.includes("vidéo") || key.includes("video")) return `🎬 ${libelle}`;
  return libelle;
}

/**
 * Rubrique = badge plein (fond coloré).
 * Catégorie principale, plus visible que le format.
 */
export function getRubriqueBadgeClasses(libelle?: string): string {
  const base =
    "inline-flex items-center rounded-lg px-2 py-0.5 text-[11px] font-medium";
  if (!libelle) {
    return base + " bg-[#4B5563] text-white";
  }
  const key = libelle.toLowerCase();

  if (key.includes("sant")) {
    return base + " bg-[#16A34A] text-white";
  }
  if (key.includes("vie pratique")) {
    return base + " bg-[#0D9488] text-white";
  }
  if (key.includes("société")) {
    return base + " bg-[#DB2777] text-white";
  }
  if (key.includes("produits") || key.includes("services")) {
    return base + " bg-[#0EA5E9] text-white";
  }
  if (key.includes("vie de la mutuelle")) {
    return base + " bg-[#4F46E5] text-white";
  }
  return base + " bg-[#4B5563] text-white";
}

type ArticleDetailContentProps = {
  selectedId: string;
  selectedArticle: ArticleSummary | null;
  loading: boolean;
  error: string | null;
  detail: ArticleDetail | null;
  showEtat: boolean;
  back?: string;
  mine?: string;
  canOpenAdminEdit?: boolean;
};

function ArticleDetailContent({
  selectedId,
  selectedArticle,
  loading,
  error,
  detail,
  showEtat,
  back,
  mine,
  canOpenAdminEdit = false,
}: ArticleDetailContentProps) {
  const [copyState, setCopyState] = useState<
    "idle" | "html" | "text" | "error"
  >("idle");
  const [imageCopyState, setImageCopyState] = useState<
    "idle" | "copied" | "error"
  >("idle");
  const [mainImageLayout, setMainImageLayout] = useState<"portrait" | "landscape">("landscape");

  const canCopy = !!detail && !loading && !error;

  const contenuHtml = useMemo(
    () => (detail?.contenu ? transformEmbeds(detail.contenu) : ""),
    [detail?.contenu]
  );

  useEffect(() => {
    setMainImageLayout("landscape");
  }, [detail?.id, detail?.lienPhoto]);
  const statusContext = mine === "1" ? "author" : "public";

  const handleCopyHtml = async () => {
    if (!detail || loading || error) return;
    try {
      const response = await fetch(`/api/articles/${detail.id}/export?format=html`, {
        cache: "no-store",
      });
      if (!response.ok) throw new Error("Export HTML indisponible.");
      const html = await response.text();
      await navigator.clipboard.writeText(html);
      setCopyState("html");
      window.setTimeout(() => setCopyState("idle"), 2000);
    } catch {
      setCopyState("error");
      window.setTimeout(() => setCopyState("idle"), 3000);
    }
  };

  const handleCopyText = async () => {
    if (!detail || loading || error) return;
    try {
      const response = await fetch(`/api/articles/${detail.id}/export?format=txt`, {
        cache: "no-store",
      });
      if (!response.ok) throw new Error("Export texte indisponible.");
      const text = await response.text();
      await navigator.clipboard.writeText(text);
      setCopyState("text");
      window.setTimeout(() => setCopyState("idle"), 2000);
    } catch {
      setCopyState("error");
      window.setTimeout(() => setCopyState("idle"), 3000);
    }
  };

  const handleCopyImageUrl = async () => {
    if (!detail?.lienPhoto || loading || error) return;
    try {
      await navigator.clipboard.writeText(detail.lienPhoto);
      setImageCopyState("copied");
      window.setTimeout(() => setImageCopyState("idle"), 2000);
    } catch {
      setImageCopyState("error");
      window.setTimeout(() => setImageCopyState("idle"), 3000);
    }
  };

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-rer-border pb-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-rer-muted">
            {selectedArticle &&
            (selectedArticle.rubrique || selectedArticle.format)
              ? [
                  selectedArticle.rubrique?.libelle,
                  selectedArticle.format?.libelle,
                ]
                  .filter(Boolean)
                  .join(" · ")
              : "Prévisualisation"}
          </p>
          {selectedArticle && (
            <h2 className="mt-1 text-lg font-semibold text-slate-900">
              {selectedArticle.titre}
            </h2>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <button
            type="button"
            disabled={!canCopy}
            onClick={handleCopyHtml}
            className={`inline-flex items-center rounded-lg px-3 py-1.5 text-xs font-medium shadow-sm ${
              canCopy
                ? "bg-rer-orange text-white hover:bg-[#e25730]"
                : "bg-rer-app text-rer-muted"
            }`}
          >
            {copyState === "html"
              ? "HTML copié"
              : copyState === "error"
              ? "Erreur copie"
              : "Copier HTML"}
          </button>
          <button
            type="button"
            disabled={!canCopy}
            onClick={handleCopyText}
            className={`inline-flex items-center rounded-lg border px-3 py-1.5 text-xs font-medium ${
              canCopy
                ? "border-rer-border bg-white text-rer-text hover:bg-rer-app/60"
                : "border-rer-border bg-rer-app text-rer-muted"
            }`}
          >
            {copyState === "text"
              ? "Texte copié"
              : copyState === "error"
              ? "Erreur copie"
              : "Copier texte"}
          </button>
          <a
            href={`/api/articles/${selectedId}/export?format=word`}
            className="inline-flex items-center rounded-lg border border-rer-border bg-white px-2 py-1 text-[11px] font-medium text-rer-text hover:bg-rer-app/60"
          >
            Exporter Word
          </a>
          {canOpenAdminEdit && (
            <Link
              href={`/admin/articles?article=${selectedId}`}
              className="inline-flex items-center rounded-lg border border-rer-border bg-white px-2 py-1 text-[11px] font-medium text-rer-text hover:bg-rer-app/60"
            >
              Modifier (admin)
            </Link>
          )}
        </div>
      </div>

      {loading && (
        <div className="space-y-3">
          <div className="h-4 w-32 animate-pulse rounded bg-slate-100" />
          <div className="h-4 w-52 animate-pulse rounded bg-slate-100" />
          <div className="h-32 w-full animate-pulse rounded bg-slate-100" />
        </div>
      )}

      {!loading && error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      {!loading && !error && detail && (
        <div className="flex-1 space-y-4 overflow-y-auto pr-1 text-sm text-rer-text">
          {showEtat && detail.etat && (
            <p className="text-xs text-rer-muted">
              État :{" "}
              <span className="font-medium">
                {getArticleStatusLabel(detail.etat.slug, statusContext) ??
                  detail.etat.libelle}
              </span>
            </p>
          )}
          <p className="text-xs text-rer-muted">
            {detail.auteur &&
              `${detail.auteur.prenom} ${detail.auteur.nom}`}
            {detail.mutuelle && ` · ${detail.mutuelle.nom}`}
            {(() => {
              const d =
                detail.datePublication ??
                detail.dateDepot ??
                detail.createdAt ??
                null;
              if (!d) return null;
              return ` · Publié le ${new Date(d).toLocaleDateString(
                "fr-FR"
              )}`;
            })()}
          </p>

          {detail.lienPhoto && (
            <div className="space-y-2">
              <div className="overflow-hidden rounded-lg border border-rer-border bg-rer-app">
                <Image
                  src={detail.lienPhoto}
                  alt={detail.legendePhoto || detail.titre}
                  width={1200}
                  height={700}
                  unoptimized
                  onLoadingComplete={(img) => {
                    setMainImageLayout(
                      img.naturalHeight > img.naturalWidth ? "portrait" : "landscape"
                    );
                  }}
                  className={
                    mainImageLayout === "portrait"
                      ? "h-auto w-full max-h-[32rem] object-contain"
                      : "h-auto w-full max-h-64 object-cover object-top"
                  }
                />
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <a
                  href={detail.lienPhoto}
                  download
                  className="inline-flex items-center rounded-lg border border-rer-border bg-white px-2 py-1 text-[11px] font-medium text-rer-text hover:bg-rer-app/60"
                >
                  Télécharger l’image
                </a>
                <button
                  type="button"
                  onClick={handleCopyImageUrl}
                  className="inline-flex items-center rounded-lg border border-rer-border bg-rer-app px-2 py-1 text-[11px] font-medium text-rer-text hover:bg-rer-app/80"
                >
                  {imageCopyState === "copied"
                    ? "URL copiée"
                    : imageCopyState === "error"
                    ? "Erreur copie"
                    : "Copier l’URL"}
                </button>
              </div>
              {detail.legendePhoto && (
                <p className="text-xs text-rer-muted">
                  {detail.legendePhoto}
                </p>
              )}
              {detail.creditPhoto && (
                <p className="photo-credit">{detail.creditPhoto}</p>
              )}
            </div>
          )}

          {detail.chapo && (
          <p className="whitespace-pre-wrap text-sm font-semibold text-rer-text">
              {detail.chapo}
            </p>
          )}

          {detail.contenu && (
            <div
              className="prose max-w-none text-sm text-rer-text"
              dangerouslySetInnerHTML={{ __html: contenuHtml }}
            />
          )}

          {detail.postRs && (
            <div className="rounded-lg bg-rer-app p-3">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Post réseaux sociaux
              </p>
              <p className="whitespace-pre-wrap text-sm text-rer-text">
                {detail.postRs}
              </p>
            </div>
          )}
        </div>
      )}
    </>
  );
}

export function ArticlesExplorerView({
  articles,
  total,
  initialPage,
  pageSize,
  q,
  etatSlug,
  mutuelleId,
  rubriqueId = "",
  formatId = "",
  initialSelectedId,
  since = "",
  from = "",
  to = "",
  mine = "",
  back = "",
  showEtat,
  canOpenAdminEdit = false,
}: ArticlesExplorerViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const getSortTime = (a: ArticleSummary) => {
    const refDate = a.datePublication ?? a.dateDepot ?? a.createdAt;
    if (!refDate) return 0;
    return new Date(refDate).getTime();
  };

  const [visibleArticles, setVisibleArticles] = useState<ArticleSummary[]>(
    () => [...articles].sort((a, b) => getSortTime(b) - getSortTime(a))
  );
  const [selectedId, setSelectedId] = useState<string | null>(
    initialSelectedId || (articles[0]?.id ?? null)
  );
  const [detail, setDetail] = useState<ArticleDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [hasMore, setHasMore] = useState(articles.length < total);
  const [loadingMore, setLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const currentPageRef = useRef(initialPage);

  // Quand les filtres / la recherche changent (nouvelles props côté serveur),
  // on réinitialise la liste visible, la pagination et la sélection si nécessaire.
  useEffect(() => {
    const sorted = [...articles].sort((a, b) => getSortTime(b) - getSortTime(a));
    setVisibleArticles(sorted);
    setHasMore(articles.length < total);
    currentPageRef.current = initialPage;
    setSelectedId((prev) => {
      if (prev && articles.some((a) => a.id === prev)) {
        return prev;
      }
      return initialSelectedId || (articles[0]?.id ?? null);
    });
  }, [articles, total, initialPage, initialSelectedId]);


  const selectedArticle = useMemo(
    () => visibleArticles.find((a) => a.id === selectedId) || null,
    [visibleArticles, selectedId]
  );

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

      setVisibleArticles((prev) => {
        const existingIds = new Set(prev.map((a) => a.id));
        const merged = [
          ...prev,
          ...newArticles.filter((a) => !existingIds.has(a.id)),
        ].sort((a, b) => getSortTime(b) - getSortTime(a));
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
    if (!selectedId) {
      setDetail(null);
      setError(null);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError(null);
    setDetail(null);

    fetch(`/api/articles/${selectedId}?scope=preview`, {
      signal: controller.signal,
    })
      .then((res) => {
        if (!res.ok) return null;
        return res.json();
      })
      .then((data: ArticleDetail | null) => {
        if (!data) {
          setDetail(null);
          setError("Article introuvable ou erreur de chargement.");
        } else {
          setDetail(data);
        }
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setDetail(null);
        setError("Erreur lors du chargement de l’article.");
      })
      .finally(() => {
        if (controller.signal.aborted) return;
        setLoading(false);
      });

    return () => {
      controller.abort();
    };
  }, [selectedId]);

  const updateUrlSelection = (id: string | null) => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(
      searchParams?.toString() ?? window.location.search
    );
    if (id) {
      params.set("article", id);
    } else {
      params.delete("article");
    }
    const query = params.toString();
    const nextUrl = `${window.location.pathname}${query ? `?${query}` : ""}`;
    window.history.replaceState(window.history.state, "", nextUrl);
  };

  const handleSelect = (id: string) => {
    setSelectedId(id);
    updateUrlSelection(id);
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      setIsDrawerOpen(true);
    }
  };

  const handleOpenFull = (id: string) => {
    const params = new URLSearchParams();
    if (back) params.set("back", back);
    if (mine === "1") params.set("mine", "1");
    const query = params.toString();
    router.push(`/articles/${id}${query ? `?${query}` : ""}`);
  };

  const handleExportWord = (id: string) => {
    window.open(`/api/articles/${id}/export?format=word`, "_blank");
  };

  useArticleShortcuts({
    articles: visibleArticles,
    selectedId,
    onSelect: handleSelect,
    onOpenFull: handleOpenFull,
    onExportWord: handleExportWord,
  });

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

  if (!visibleArticles.length) {
    return (
      <p className="rounded-lg bg-white px-3 py-6 text-center text-sm text-rer-muted shadow-sm ring-1 ring-rer-border">
        Aucun article ne correspond à ces critères. Essayez d&apos;élargir
        votre recherche ou de modifier les filtres.
      </p>
    );
  }

  return (
    <>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,2fr)]">
        <div className="space-y-2 max-h-[calc(100vh-120px)] overflow-y-auto pr-1 border-r border-rer-border">
          {visibleArticles.map((article) => {
            const isSelected = article.id === selectedId;
            return (
              <button
                key={article.id}
                type="button"
                onClick={() => handleSelect(article.id)}
                aria-pressed={isSelected}
                className={`group flex w-full cursor-pointer rounded-2xl text-left transition-colors transition-shadow transition-transform duration-150 ease-out ${
                  isSelected
                    ? "border border-rer-blue bg-rer-blue/5 shadow-md"
                    : "border border-transparent bg-white hover:border-rer-border hover:bg-rer-app hover:shadow-sm hover:-translate-y-[1px]"
                }`}
              >
                <article className="flex h-full flex-1 items-stretch gap-3 overflow-hidden rounded-2xl">
                  <div className="relative hidden w-32 flex-none bg-rer-app sm:block">
                    {article.lienPhoto ? (
                      <Image
                        src={article.lienPhoto}
                        alt={article.legendePhoto || article.titre}
                        fill
                        sizes="128px"
                        unoptimized
                        className="object-cover object-top"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[10px] text-rer-muted">
                        Pas de photo
                      </div>
                    )}
                  </div>
                    <div className="flex flex-1 flex-col gap-1 p-3">
                    <div className="flex flex-wrap items-center justify-end gap-1 text-[11px]">
                      {article.format && (
                        <span
                          className={getFormatBadgeClasses(
                            article.format.libelle
                          )}
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
                      {showEtat && article.etat && (
                        <span
                          className={getEtatBadgeClasses(
                            article.etat.slug,
                            isSelected
                          )}
                        >
                          {getArticleStatusLabel(
                            article.etat.slug,
                            mine === "1" ? "author" : "public"
                          ) ?? article.etat.libelle}
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-semibold text-rer-text">
                      {article.titre}
                    </p>
                    {article.chapo && (
                      <p className="line-clamp-2 text-xs text-rer-muted">
                        {article.chapo}
                      </p>
                    )}
                    <div className="mt-1 flex items-center justify-between gap-2 text-[11px] text-rer-muted">
                      <p className="truncate">
                        {article.auteur &&
                          `${article.auteur.prenom} ${article.auteur.nom}`}
                        {article.mutuelle && ` · ${article.mutuelle.nom}`}
                      </p>
                      <p className="whitespace-nowrap">
                        {(() => {
                          const d =
                            article.datePublication ??
                            article.dateDepot ??
                            article.createdAt;
                          return d
                            ? new Date(d).toLocaleDateString("fr-FR")
                            : null;
                        })()}
                      </p>
                    </div>
                  </div>
                </article>
              </button>
            );
          })}
          <div ref={sentinelRef} className="h-6 lg:h-8" />
        </div>

        <div className="hidden min-h-[260px] flex-col rounded-xl bg-white p-4 shadow-sm ring-1 ring-rer-border lg:flex">
          {!selectedId && (
            <p className="text-sm text-rer-muted">
              Sélectionnez un article dans la liste pour voir son contenu.
            </p>
          )}

          {selectedId && (
            <ArticleDetailContent
              selectedId={selectedId}
              selectedArticle={selectedArticle}
              loading={loading}
              error={error}
              detail={detail}
              showEtat={showEtat}
              back={back}
              mine={mine}
              canOpenAdminEdit={canOpenAdminEdit}
            />
          )}
        </div>
      </div>

      {selectedId && isDrawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/40 lg:hidden"
          onClick={() => setIsDrawerOpen(false)}
        >
          <div
            className="absolute inset-x-0 bottom-0 top-16 rounded-t-2xl bg-white shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-rer-border px-4 py-3">
              <span className="text-sm font-medium text-rer-text">
                Prévisualisation
              </span>
              <button
                type="button"
                onClick={() => setIsDrawerOpen(false)}
                className="rounded-lg border border-rer-border bg-white px-2 py-1 text-xs text-rer-muted hover:bg-rer-app/60"
              >
                Fermer
              </button>
            </div>
            <div className="h-[calc(100vh-4.5rem)] overflow-y-auto px-4 py-3">
              <ArticleDetailContent
                selectedId={selectedId}
                selectedArticle={selectedArticle}
                loading={loading}
                error={error}
                detail={detail}
                showEtat={showEtat}
                back={back}
                mine={mine}
                canOpenAdminEdit={canOpenAdminEdit}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

