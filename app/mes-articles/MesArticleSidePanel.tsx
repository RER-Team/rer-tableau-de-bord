"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ArticleEditorCard, {
  type ArticleEditorReferentiels,
  type ArticleEditorValue,
} from "@/app/components/ArticleEditorCard";
import {
  getEtatBadgeClasses,
  getFormatBadgeClasses,
  getRubriqueBadgeClasses,
} from "@/app/articles/ArticlesCardsExplorer";
import { getArticleStatusLabel } from "@/lib/article-status";
import {
  buildInitialHtml,
  extractChapoAndBody,
  transformEmbeds,
} from "@/lib/article-html";

type ArticleDetail = {
  id: string;
  titre: string;
  chapo: string | null;
  contenu: string | null;
  contenuJson?: unknown | null;
  lienPhoto: string | null;
  legendePhoto: string | null;
  creditPhoto: string | null;
  postRs: string | null;
  auteurId: string;
  mutuelleId: string | null;
  rubriqueId: string | null;
  formatId: string | null;
  lienGoogleDoc?: string | null;
  auteur: { prenom: string; nom: string } | null;
  mutuelle: { nom: string } | null;
  rubrique: { libelle: string } | null;
  format: { libelle: string } | null;
  etat: { libelle: string; slug: string } | null;
};

type MesArticleSidePanelProps = {
  articleId: string | null;
  mode: "view" | "edit";
  open: boolean;
  onClose: () => void;
  onModeChange: (mode: "view" | "edit") => void;
};

export function MesArticleSidePanel({
  articleId,
  mode,
  open,
  onClose,
  onModeChange,
}: MesArticleSidePanelProps) {
  const router = useRouter();
  const [article, setArticle] = useState<ArticleDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ref, setRef] = useState<ArticleEditorReferentiels | null>(null);
  const [savingContent, setSavingContent] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [postRsDraft, setPostRsDraft] = useState("");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const panelCloseButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!article) return;
    setTitleDraft(article.titre ?? "");
    setPostRsDraft(article.postRs ?? "");
  }, [article]);

  const initialHtml = useMemo(() => buildInitialHtml(article), [article]);

  useEffect(() => {
    if (!open || !articleId) return;
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    fetch(`/api/articles/${articleId}?scope=preview`, {
      signal: controller.signal,
    })
      .then((r) => {
        if (!r.ok) throw new Error("Contenu introuvable");
        return r.json();
      })
      .then((data: ArticleDetail) => {
        setArticle(data);
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
  }, [articleId, open]);

  useEffect(() => {
    if (!open || mode !== "edit") return;
    fetch("/api/referentiels")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return;
        setRef({
          auteurs: data.auteurs,
          mutuelles: data.mutuelles,
          rubriques: data.rubriques,
          formats: data.formats,
        });
      })
      .catch(() => setRef(null));
  }, [open, mode]);

  // Accessibilité du panneau : fermeture Escape, focus initial et restauration.
  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const focusTimer = window.setTimeout(() => {
      panelCloseButtonRef.current?.focus();
    }, 0);
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener("keydown", handleKeyDown);
      previouslyFocused?.focus?.();
    };
  }, [open, onClose]);

  const performMainImageUpload = useCallback(
    async (file: File) => {
      if (!article) return;
      setUploadingImage(true);
      setUploadError(null);
      try {
        const { uploadArticleImage } = await import("@/lib/uploadArticleImage");
        const { publicUrl } = await uploadArticleImage({
          file,
          filename: file.name,
          articleId: article.id,
        });
        const res = await fetch(`/api/articles/${article.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lienPhoto: publicUrl }),
        });
        if (res.ok) {
          const updated = await res.json();
          setArticle((prev) => (prev ? { ...prev, lienPhoto: updated.lienPhoto } : null));
          setLastSavedAt(new Date());
          router.refresh();
        } else {
          setUploadError("Erreur lors de la mise à jour de l’image principale");
        }
      } catch (e) {
        console.error("Upload image", e);
        setUploadError("Erreur lors de l’upload de l’image principale");
      } finally {
        setUploadingImage(false);
      }
    },
    [article, router]
  );

  const handleEditorChange = useCallback(
    async (patch: Partial<ArticleEditorValue>) => {
      if (!article) return;
      if (patch.titre !== undefined) setTitleDraft(patch.titre);
      if (patch.postRs !== undefined) setPostRsDraft(patch.postRs ?? "");
      const payload: Record<string, unknown> = {};
      if (patch.titre !== undefined) payload.titre = patch.titre;
      if (patch.postRs !== undefined)
        payload.postRs = (patch.postRs || "").trim() || null;
      if (patch.formatId !== undefined) payload.formatId = patch.formatId || null;
      if (patch.rubriqueId !== undefined) payload.rubriqueId = patch.rubriqueId || null;
      if (patch.auteurId !== undefined) payload.auteurId = patch.auteurId || null;
      if (patch.mutuelleId !== undefined) payload.mutuelleId = patch.mutuelleId || null;
      if (patch.lienPhoto !== undefined) payload.lienPhoto = patch.lienPhoto ?? null;
      if (patch.legendePhoto !== undefined)
        payload.legendePhoto = patch.legendePhoto || null;
      if (patch.creditPhoto !== undefined)
        payload.creditPhoto = patch.creditPhoto || null;
      if (
        patch.contenuHtml !== undefined ||
        patch.contenuJson !== undefined
      ) {
        const html = patch.contenuHtml ?? initialHtml;
        const effectiveFormatId = patch.formatId ?? article.formatId ?? "";
        const allowChapo =
          ref?.formats.find((f) => f.id === effectiveFormatId)?.hasChapo ?? true;
        const { chapo, body } = extractChapoAndBody(html, allowChapo);
        payload.chapo = chapo;
        payload.contenuHtml = body;
        payload.contenuJson = patch.contenuJson ?? article.contenuJson;
      }
      if (Object.keys(payload).length === 0) return;
      setSavingContent(true);
      try {
        const res = await fetch(`/api/articles/${article.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const updated = await res.json();
          setArticle((prev) => (prev ? { ...prev, ...updated } : null));
          setLastSavedAt(new Date());
        }
      } catch (e) {
        console.error("Sauvegarde contenu", e);
      } finally {
        setSavingContent(false);
      }
    },
    [article, initialHtml, ref]
  );

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
        role="dialog"
        aria-modal="true"
        aria-label="Détail du contenu"
        className="flex h-full w-full flex-col bg-white shadow-xl ring-1 ring-rer-border sm:min-w-[560px] sm:w-[55%] sm:max-w-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-rer-border px-4 py-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onModeChange("view")}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${
                mode === "view"
                  ? "border-rer-blue bg-rer-blue text-white"
                  : "border-rer-border bg-white text-rer-muted hover:bg-rer-app"
              }`}
            >
              Lecture
            </button>
            <button
              type="button"
              onClick={() => onModeChange("edit")}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${
                mode === "edit"
                  ? "border-rer-blue bg-rer-blue text-white"
                  : "border-rer-border bg-white text-rer-muted hover:bg-rer-app"
              }`}
            >
              Édition
            </button>
          </div>
          <div className="flex items-center gap-3">
            {mode === "edit" && lastSavedAt && (
              <span className="text-[11px] text-rer-muted">
                Enregistré à{" "}
                {lastSavedAt.toLocaleTimeString("fr-FR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            )}
            <button
              ref={panelCloseButtonRef}
              type="button"
              onClick={onClose}
              className="rounded-lg border border-rer-border bg-white px-3 py-1.5 text-xs font-medium text-rer-muted hover:bg-rer-app"
            >
              Fermer
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {loading && (
            <p className="text-sm text-rer-muted">Chargement…</p>
          )}
          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          {!loading && !error && article && mode === "view" && (
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
                        {article.format.libelle}
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
                        {getArticleStatusLabel(article.etat.slug, "author") ??
                          article.etat.libelle}
                      </span>
                    )}
                    {article.auteur &&
                      ` ${article.auteur.prenom} ${article.auteur.nom}`}
                    {article.mutuelle && ` · ${article.mutuelle.nom}`}
                  </p>
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
                      className="h-auto w-full max-h-80 object-cover object-top"
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
                <Link
                  href={`/articles/${article.id}?back=mes-articles`}
                  className="inline-flex items-center rounded-lg border border-rer-border bg-white px-3 py-1.5 text-xs font-medium text-rer-text hover:bg-rer-app"
                >
                  Ouvrir en pleine page
                </Link>
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
            </div>
          )}

          {!loading && !error && article && mode === "edit" && ref && (
            <div className="space-y-4">
              <div className="flex items-center justify-end text-[11px] text-rer-muted">
                {savingContent
                  ? "Enregistrement…"
                  : lastSavedAt
                  ? `Enregistré à ${lastSavedAt.toLocaleTimeString("fr-FR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}`
                  : "Enregistré"}
              </div>
              <ArticleEditorCard
                mode="edit"
                value={{
                  formatId: article.formatId ?? "",
                  rubriqueId: article.rubriqueId ?? "",
                  auteurId: article.auteurId,
                  mutuelleId: article.mutuelleId ?? undefined,
                  lienPhoto: article.lienPhoto,
                  legendePhoto: article.legendePhoto ?? "",
                  creditPhoto: article.creditPhoto ?? "",
                  titre: titleDraft,
                  contenuHtml: initialHtml,
                  contenuJson: article.contenuJson ?? null,
                  postRs: postRsDraft,
                }}
                referentiels={ref}
                uploadingImage={uploadingImage}
                uploadError={uploadError}
                onChange={handleEditorChange}
                onUploadMainImage={performMainImageUpload}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
