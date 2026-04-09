"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ingestDebug } from "@/lib/ingest-debug";
import {
  type ArticleStatusOption,
  getArticleStatusLabel,
  normalizeArticleStatusSlug,
} from "@/lib/article-status";
import { getEtatBadgeClasses } from "../articles/ArticlesCardsExplorer";
import ArticleEditorCard, {
  ArticleEditorReferentiels,
  ArticleEditorValue,
} from "../components/ArticleEditorCard";

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

type Etat = ArticleStatusOption;

type ArticleDetail = {
  id: string;
  titre: string;
  chapo: string | null;
  contenu: string | null;
  contenuJson?: unknown | null;
  auteurId: string;
  mutuelleId: string | null;
  rubriqueId?: string | null;
  formatId?: string | null;
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
  historiques: {
    id: string;
    createdAt: string;
    etat: { libelle: string; slug: string } | null;
    user: { email: string | null } | null;
    commentaire: string | null;
  }[];
};

type AdminReferentiels = ArticleEditorReferentiels;

type AuteurOption = {
  id: string;
  prenom: string;
  nom: string;
  mutuelle?: { nom: string | null } | null;
};

type AdminReviewExplorerProps = {
  articles: ArticleSummary[];
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
  initialSelectedId?: string;
  etats: Etat[];
};

type AdminActionMenuItem = {
  id: string;
  label: string;
  tone?: "default" | "danger";
  active?: boolean;
  onSelect: () => void | Promise<void>;
};

function getActionTriggerClasses(slug: string | null, open: boolean): string {
  const base =
    "inline-flex h-9 min-h-9 items-center gap-2 rounded-xl border px-3 py-2 text-[11px] font-medium shadow-sm transition";

  switch (normalizeArticleStatusSlug(slug)) {
    case "a_relire":
      return `${base} border-[#FACC15]/60 bg-[#FEF9C3] text-[#854D0E] ${
        open ? "ring-1 ring-[#FACC15]/70" : "hover:bg-[#FEF3A6]"
      }`;
    case "publie":
      return `${base} border-[#22C55E] bg-[#16A34A] text-white ${
        open ? "ring-1 ring-[#4ADE80]" : "hover:bg-[#15803D]"
      }`;
    default:
      return `${base} border-rer-border bg-white text-rer-text ${
        open ? "ring-1 ring-rer-blue" : "hover:bg-rer-app"
      }`;
  }
}

function AdminActionMenu({
  label,
  currentSlug = null,
  items,
  disabled = false,
  loading = false,
  align = "left",
}: {
  label: string;
  currentSlug?: string | null;
  items: AdminActionMenuItem[];
  disabled?: boolean;
  loading?: boolean;
  align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    window.addEventListener("mousedown", handlePointerDown);
    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        disabled={disabled || loading}
        onClick={() => setOpen((value) => !value)}
        className={`${getActionTriggerClasses(
          currentSlug,
          open
        )} ${(disabled || loading) ? "cursor-not-allowed opacity-60" : ""}`}
        aria-expanded={open}
      >
        <span>{loading ? "Action..." : label}</span>
        <svg
          viewBox="0 0 20 20"
          aria-hidden="true"
          className={`h-4 w-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <path d="M5 7.5 10 12.5 15 7.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div
          className={`absolute z-20 mt-2 min-w-[220px] rounded-2xl border border-rer-border bg-white p-2 shadow-xl ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          <div className="space-y-1">
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={async () => {
                  setOpen(false);
                  await item.onSelect();
                }}
                className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition ${
                  item.tone === "danger"
                    ? "text-red-600 hover:bg-red-50"
                    : item.active
                    ? "bg-rer-blue/8 text-rer-blue"
                    : "text-rer-text hover:bg-rer-app"
                }`}
              >
                <span>{item.label}</span>
                {item.active ? (
                  <span className="text-[10px] font-medium uppercase tracking-wide">
                    Actuel
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function AdminArticlePanel({
  selectedId,
  selectedArticle,
  detail,
  loading,
  error,
  etats,
  onEtatUpdated,
  onDetailUpdated,
  listCollapsed,
  onToggleListCollapsed,
  showListToggle = true,
}: {
  selectedId: string;
  selectedArticle: ArticleSummary | null;
  detail: ArticleDetail | null;
  loading: boolean;
  error: string | null;
  etats: Etat[];
  onEtatUpdated: (etatSlug: string | null) => void;
  onDetailUpdated?: (article: ArticleDetail) => void;
  listCollapsed: boolean;
  onToggleListCollapsed: () => void;
  showListToggle?: boolean;
}) {
  const router = useRouter();
  const [updatingEtat, setUpdatingEtat] = useState(false);
  const [savingContent, setSavingContent] = useState(false);
  const [savingMeta, setSavingMeta] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [titleDraft, setTitleDraft] = useState("");
  const [postRsDraft, setPostRsDraft] = useState("");
  const [auteursOptions, setAuteursOptions] = useState<AuteurOption[]>([]);
  const [auteurIdDraft, setAuteurIdDraft] = useState<string | null>(null);
  const [ref, setRef] = useState<AdminReferentiels | null>(null);
  const originalSnapshotRef = useRef<ArticleDetail | null>(null);
  const [showDiff, setShowDiff] = useState(false);
  const [runningPrimaryAction, setRunningPrimaryAction] = useState(false);

  useEffect(() => {
    if (detail) {
      setTitleDraft(detail.titre);
      setPostRsDraft(detail.postRs ?? "");
      setAuteurIdDraft(detail.auteurId ?? null);
      setLastSavedAt(new Date());
      if (!originalSnapshotRef.current) {
        originalSnapshotRef.current = detail;
      }
    } else if (selectedArticle) {
      setTitleDraft(selectedArticle.titre);
    }
  }, [detail, selectedArticle]);

  useEffect(() => {
    let cancelled = false;
    if (auteursOptions.length > 0) return;
    fetch("/api/admin/auteurs")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data || cancelled) return;
        setAuteursOptions(data.auteurs as AuteurOption[]);
      })
      .catch(() => {
        // silencieux pour l’instant
      });
    return () => {
      cancelled = true;
    };
  }, [auteursOptions.length]);

  useEffect(() => {
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
      .catch(() => {
        setRef(null);
      });
  }, []);

  const touchLastSaved = () => {
    setLastSavedAt(new Date());
  };

  const handleChangeEtat = async (targetEtatSlug: string) => {
    if (!detail || updatingEtat) return;
    setUpdatingEtat(true);
    try {
      ingestDebug({
        sessionId: "fb943b",
        runId: "pre-fix",
        hypothesisId: "H_STATE_CHANGE",
        location: "app/admin/AdminReviewExplorer.tsx:handleChangeEtat:beforeFetch",
        message: "handleChangeEtat called",
        data: { articleId: detail.id, targetEtatSlug },
      });

      const res = await fetch(`/api/articles/${detail.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ etatSlug: targetEtatSlug }),
      });
      ingestDebug({
        sessionId: "fb943b",
        runId: "pre-fix",
        hypothesisId: "H_STATE_CHANGE",
        location: "app/admin/AdminReviewExplorer.tsx:handleChangeEtat:afterFetch",
        message: "handleChangeEtat response",
        data: { ok: res.ok, status: res.status },
      });

      if (!res.ok) {
        return;
      }
      const updated = (await res.json()) as ArticleDetail;
      onEtatUpdated(updated.etat?.slug ?? null);
      router.refresh();
    } finally {
      setUpdatingEtat(false);
    }
  };

  const sortedEtats = [...etats].sort((a, b) => a.ordre - b.ordre);
  const currentSlug = normalizeArticleStatusSlug(
    detail?.etat?.slug ?? selectedArticle?.etat?.slug ?? null
  );

  const buildInitialHtml = useMemo(() => {
    if (!detail) return "";
    const chapoHtml = detail.chapo
      ? `<p class="chapo">${detail.chapo}</p>`
      : "";
    return `${chapoHtml}${detail.contenu ?? ""}`;
  }, [detail]);

  const extractChapoAndBody = (html: string): { chapo: string | null; body: string } => {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");
      let chapoText: string | null = null;
      const chapoEl =
        doc.querySelector("p.chapo") ?? doc.querySelector("p");
      if (chapoEl) {
        chapoText = (chapoEl.textContent ?? "").trim() || null;
        chapoEl.remove();
      }
      const bodyHtml = doc.body.innerHTML.trim();
      return { chapo: chapoText, body: bodyHtml };
    } catch {
      return { chapo: detail?.chapo ?? null, body: html };
    }
  };

  const handleSaveTitle = async () => {
    if (!detail && !selectedArticle) return;
    const nextTitle = titleDraft.trim();
    const currentTitle = detail?.titre ?? selectedArticle?.titre ?? "";
    if (!nextTitle || nextTitle === currentTitle) return;
    setSavingMeta(true);
    try {
      const res = await fetch(`/api/articles/${detail?.id ?? selectedId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ titre: nextTitle }),
      });
      if (res.ok) {
        touchLastSaved();
        router.refresh();
      }
    } finally {
      setSavingMeta(false);
    }
  };

  const handleSavePostRs = async (nextValue: string) => {
    if (!detail) return;
    const next = nextValue.trim();
    if ((detail.postRs ?? "") === next) return;
    setSavingMeta(true);
    try {
      const res = await fetch(`/api/articles/${detail.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postRs: next || null }),
      });
      if (res.ok) {
        touchLastSaved();
        router.refresh();
      }
    } finally {
      setSavingMeta(false);
    }
  };

  const handleChangeAuteur = async (newAuteurId: string) => {
    setAuteurIdDraft(newAuteurId);
    if (!detail) return;
    if (!newAuteurId || newAuteurId === detail.auteurId) return;
    setSavingMeta(true);
    try {
      const res = await fetch(`/api/articles/${detail.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ auteurId: newAuteurId }),
      });
      if (res.ok) {
        touchLastSaved();
        router.refresh();
      }
    } finally {
      setSavingMeta(false);
    }
  };

  const performMainImageUpload = async (file: File) => {
    if (!detail) return;
    setUploadingImage(true);
    setUploadError(null);
    try {
      const { uploadArticleImage } = await import("@/lib/uploadArticleImage");
      const { publicUrl } = await uploadArticleImage({
        file,
        filename: file.name,
        articleId: detail.id,
      });
      const res = await fetch(`/api/articles/${detail.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lienPhoto: publicUrl }),
      });
      if (!res.ok) {
        console.error("Erreur lors de la mise à jour de l’image principale");
        setUploadError("Erreur lors de la mise à jour de l’image principale");
      } else {
        const updated = (await res.json()) as ArticleDetail;
        onDetailUpdated?.(updated);
        touchLastSaved();
        router.refresh();
      }
    } catch (e) {
      console.error("Erreur lors de l’upload de l’image principale", e);
      setUploadError("Erreur lors de l’upload de l’image principale");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleDelete = async () => {
    if (!detail && !selectedArticle) return;
    const id = detail?.id ?? selectedId;
    const titre = detail?.titre ?? selectedArticle?.titre ?? "cet article";
    const confirmed = window.confirm(
      `Voulez-vous vraiment supprimer « ${titre} » ? Cette action est définitive.`
    );
    if (!confirmed) return;
    try {
      const res = await fetch(`/api/articles/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.error || "Erreur lors de la suppression.");
        return;
      }
      router.push("/admin/articles");
      router.refresh();
    } catch {
      alert("Erreur réseau lors de la suppression.");
    }
  };

  const currentEtatSlug = currentSlug ?? "";
  const actionMenuItems: AdminActionMenuItem[] = detail
    ? [
        ...sortedEtats.map((etat) => ({
          id: `etat-${etat.slug}`,
          label: etat.libelle,
          active: etat.slug === currentEtatSlug,
          onSelect: async () => {
            setRunningPrimaryAction(true);
            try {
              await handleChangeEtat(etat.slug);
            } finally {
              setRunningPrimaryAction(false);
            }
          },
        })),
        {
          id: "delete",
          label: "Supprimer",
          tone: "danger" as const,
          onSelect: async () => {
            setRunningPrimaryAction(true);
            try {
              await handleDelete();
            } finally {
              setRunningPrimaryAction(false);
            }
          },
        },
      ]
    : [];

  return (
    <div className="flex h-full flex-col">
      {/* Barre unique : Liste + Actions + Afficher modifs + Enregistré */}
      <div className="admin-action-bar mb-3 flex flex-wrap items-center gap-2 border-b border-rer-border pb-3">
        {showListToggle && (
          <button
            type="button"
            onClick={onToggleListCollapsed}
            className="inline-flex h-9 min-h-9 items-center gap-1 rounded-lg border border-rer-border bg-white px-3 py-2 text-[11px] font-medium text-rer-text hover:bg-rer-app"
            aria-label={listCollapsed ? "Afficher la liste" : "Replier la liste"}
          >
            {listCollapsed ? "\u25B6\u00A0Liste" : "\u25C0\u00A0Liste"}
          </button>
        )}
        {detail && (
          <div className="flex items-center gap-2 text-[11px] text-rer-muted">
            <span>Action :</span>
            <AdminActionMenu
              label={getArticleStatusLabel(currentSlug, "admin") ?? "Actions"}
              currentSlug={currentSlug}
              items={actionMenuItems}
              loading={updatingEtat || runningPrimaryAction}
            />
          </div>
        )}
        {detail && (
          <button
            type="button"
            onClick={() => setShowDiff((v) => !v)}
            className="btn-action inline-flex h-9 min-h-9 items-center rounded-lg px-3 py-2"
          >
            {showDiff ? "Masquer les modifications" : "Afficher les modifications"}
          </button>
        )}
        {detail && (
          <span className="ml-auto text-[11px] text-rer-muted">
            {savingContent
              ? "Enregistrement…"
              : lastSavedAt
              ? `Enregistré à ${lastSavedAt.toLocaleTimeString("fr-FR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}`
              : "Enregistré"}
          </span>
        )}
      </div>

      {loading && (
        <p className="mt-2 text-sm text-rer-muted">Chargement…</p>
      )}
      {!loading && error && (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      )}

      {!loading && !error && detail && ref && (
        <div className="mt-2 flex-1 space-y-4 overflow-y-auto pr-1 text-sm text-rer-text">
          <ArticleEditorCard
            mode="edit"
            value={{
              formatId: detail.formatId ?? "",
              rubriqueId: detail.rubriqueId ?? "",
              auteurId: detail.auteurId,
              mutuelleId: detail.mutuelleId ?? undefined,
              lienPhoto: detail.lienPhoto,
              legendePhoto: detail.legendePhoto ?? "",
              creditPhoto: detail.creditPhoto ?? "",
              // On utilise le draft local pour rendre le titre vraiment éditable.
              titre: titleDraft,
              contenuHtml: buildInitialHtml,
              contenuJson: detail.contenuJson ?? null,
              postRs: postRsDraft,
            }}
            referentiels={ref}
            uploadingImage={uploadingImage}
            uploadError={uploadError}
            onChange={async (patch: Partial<ArticleEditorValue>) => {
              const payload: Record<string, any> = {};
              if (patch.titre !== undefined) {
                setTitleDraft(patch.titre);
                payload.titre = patch.titre;
              }
              if (patch.postRs !== undefined) {
                setPostRsDraft(patch.postRs || "");
                payload.postRs = (patch.postRs || "").trim() || null;
              }
              if (patch.formatId !== undefined) {
                payload.formatId = patch.formatId || null;
              }
              if (patch.rubriqueId !== undefined) {
                payload.rubriqueId = patch.rubriqueId || null;
              }
              if (patch.auteurId !== undefined) {
                setAuteurIdDraft(patch.auteurId);
                payload.auteurId = patch.auteurId || null;
              }
              if (patch.mutuelleId !== undefined) {
                payload.mutuelleId = patch.mutuelleId || null;
              }
              if (patch.lienPhoto !== undefined) {
                payload.lienPhoto = patch.lienPhoto ?? null;
              }
              if (patch.legendePhoto !== undefined) {
                payload.legendePhoto = patch.legendePhoto || null;
              }
              if (patch.creditPhoto !== undefined) {
                payload.creditPhoto = patch.creditPhoto || null;
              }
              if (
                patch.contenuHtml !== undefined ||
                patch.contenuJson !== undefined
              ) {
                const html = patch.contenuHtml ?? buildInitialHtml;
                const { chapo, body } = extractChapoAndBody(html);
                payload.chapo = chapo;
                payload.contenuHtml = body;
                payload.contenuJson = patch.contenuJson ?? detail.contenuJson;
              }

              if (Object.keys(payload).length === 0) return;

              setSavingContent(true);
              try {
                const res = await fetch(`/api/articles/${detail.id}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(payload),
                });
                if (!res.ok) {
                  console.error("Erreur lors de la sauvegarde de l’article");
                } else {
                  const updated = (await res.json()) as ArticleDetail;
                  onDetailUpdated?.(updated);
                  touchLastSaved();
                }
              } catch (e) {
                console.error("Erreur lors de la sauvegarde de l’article", e);
              } finally {
                setSavingContent(false);
              }
            }}
            onUploadMainImage={performMainImageUpload}
          />

          {showDiff && originalSnapshotRef.current && (
            <div className="space-y-2 rounded-lg border border-dashed border-rer-border bg-rer-app/40 p-3 text-xs">
              <p className="mb-1 font-semibold text-rer-muted">
                Modifications par rapport à la version de référence
              </p>
              <div className="grid gap-2 md:grid-cols-2">
                <div>
                  <p className="font-medium text-rer-text">Titre</p>
                  <p className="text-rer-muted line-through">
                    {originalSnapshotRef.current.titre}
                  </p>
                  <p className="text-rer-text">{detail.titre}</p>
                </div>
                <div>
                  <p className="font-medium text-rer-text">Format</p>
                  <p className="text-rer-muted line-through">
                    {originalSnapshotRef.current.format?.libelle ?? "—"}
                  </p>
                  <p className="text-rer-text">
                    {detail.format?.libelle ?? "—"}
                  </p>
                </div>
                <div>
                  <p className="font-medium text-rer-text">Rubrique</p>
                  <p className="text-rer-muted line-through">
                    {originalSnapshotRef.current.rubrique?.libelle ?? "—"}
                  </p>
                  <p className="text-rer-text">
                    {detail.rubrique?.libelle ?? "—"}
                  </p>
                </div>
                <div>
                  <p className="font-medium text-rer-text">Signature</p>
                  <p className="text-rer-muted line-through">
                    {originalSnapshotRef.current.auteur
                      ? `${originalSnapshotRef.current.auteur.prenom} ${originalSnapshotRef.current.auteur.nom}`
                      : "—"}
                  </p>
                  <p className="text-rer-text">
                    {detail.auteur
                      ? `${detail.auteur.prenom} ${detail.auteur.nom}`
                      : "—"}
                  </p>
                </div>
                <div>
                  <p className="font-medium text-rer-text">Image principale</p>
                  <p className="text-rer-muted line-through break-all">
                    {originalSnapshotRef.current.lienPhoto ?? "—"}
                  </p>
                  <p className="text-rer-text break-all">
                    {detail.lienPhoto ?? "—"}
                  </p>
                </div>
                <div>
                  <p className="font-medium text-rer-text">Post réseaux sociaux</p>
                  <p className="text-rer-muted line-through">
                    {originalSnapshotRef.current.postRs ?? "—"}
                  </p>
                  <p className="text-rer-text">{detail.postRs ?? "—"}</p>
                </div>
              </div>
              <div>
                <p className="font-medium text-rer-text">Texte (aperçu)</p>
                <p className="text-rer-muted line-through">
                  {(originalSnapshotRef.current.contenu ?? "").slice(0, 160)}
                  {(originalSnapshotRef.current.contenu ?? "").length > 160 ? "…" : ""}
                </p>
                <p className="text-rer-text">
                  {(detail.contenu ?? "").slice(0, 160)}
                  {(detail.contenu ?? "").length > 160 ? "…" : ""}
                </p>
              </div>
            </div>
          )}

          <div className="space-y-1 rounded-lg bg-rer-app p-2 text-xs">
            <p className="font-semibold text-rer-muted">
              Historique des états
            </p>
            {detail.historiques.length === 0 ? (
              <p className="text-rer-subtle">
                Aucun changement d’état enregistré.
              </p>
            ) : (
              <ul className="space-y-1">
                {detail.historiques.map((h) => (
                  <li key={h.id} className="flex flex-wrap items-center gap-1">
                    <span className="text-[11px] text-rer-subtle">
                      {new Date(h.createdAt).toLocaleDateString("fr-FR")} ·
                    </span>
                    {h.etat && (
                      <span className="text-[11px] font-medium">
                        {getArticleStatusLabel(h.etat.slug, "admin") ??
                          h.etat.libelle}
                      </span>
                    )}
                    {h.user?.email && (
                      <span className="text-[11px] text-rer-subtle">
                        par {h.user.email}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function AdminReviewExplorer({
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
  etats,
}: AdminReviewExplorerProps) {
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
    initialSelectedId || (visibleArticles[0]?.id ?? null)
  );
  const [detail, setDetail] = useState<ArticleDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(articles.length < total);
  const [loadingMore, setLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const currentPageRef = useRef(initialPage);
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedBulkIds, setSelectedBulkIds] = useState<string[]>([]);
  const [listCollapsed, setListCollapsed] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const visibleArticlesRef = useRef<ArticleSummary[]>(visibleArticles);
  const [runningBulkAction, setRunningBulkAction] = useState(false);

  // Met à jour la liste quand les props changent
  useEffect(() => {
    const sorted = [...articles].sort((a, b) => getSortTime(b) - getSortTime(a));
    setVisibleArticles(sorted);
    setHasMore(articles.length < total);
    currentPageRef.current = initialPage;
    setSelectedId((prev) => {
      if (prev && sorted.some((a) => a.id === prev)) {
        return prev;
      }
      return initialSelectedId || (sorted[0]?.id ?? null);
    });
  }, [articles, total, initialPage, initialSelectedId]);

  useEffect(() => {
    visibleArticlesRef.current = visibleArticles;
  }, [visibleArticles]);

  const selectedArticle = useMemo(
    () => visibleArticles.find((a) => a.id === selectedId) || null,
    [visibleArticles, selectedId]
  );

  const buildUrl = (page: number) => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", String(pageSize));
    if (q) params.set("q", q);
    if (etatSlug) params.set("etat", etatSlug);
    if (mutuelleId) params.set("mutuelleId", mutuelleId);
    if (rubriqueId) params.set("rubriqueId", rubriqueId);
    if (formatId) params.set("formatId", formatId);
    if (since) params.set("since", since);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
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

  // Chargement du détail de l’article sélectionné
  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      setError(null);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError(null);

    fetch(`/api/articles/${selectedId}`, {
      signal: controller.signal,
    })
      .then(async (res) => {
        const data = await res.json().catch(() => null);
        if (!res.ok) {
          const msg =
            (data && typeof data.error === "string" && data.error) ||
            (res.status === 404 ? "Article introuvable." : "Erreur de chargement.");
          return { error: msg };
        }
        if (data && typeof data === "object" && "id" in data) return { detail: data as ArticleDetail };
        return { error: "Réponse invalide." };
      })
      .then((result: { detail?: ArticleDetail; error?: string } | null) => {
        if (controller.signal.aborted) return;
        if (!result) {
          setDetail(null);
          setError("Erreur de chargement.");
          return;
        }
        if ("error" in result && result.error) {
          setDetail(null);
          setError(result.error);
          setSelectedId((prev) => {
            if (!prev || visibleArticlesRef.current.some((a) => a.id === prev)) return prev;
            return visibleArticlesRef.current[0]?.id ?? null;
          });
          return;
        }
        if ("detail" in result && result.detail) {
          setDetail(result.detail);
          setError(null);
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

  const updateFilterUrl = (updates: Record<string, string | null>) => {
    if (!searchParams) return;
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null) {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });
    params.set("page", "1");
    const query = params.toString();
    router.replace(`/admin/articles?${query}`, { scroll: false });
  };

  const syncSelectedArticleInUrl = (id: string | null) => {
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
    window.history.replaceState(
      window.history.state,
      "",
      `/admin/articles${query ? `?${query}` : ""}`
    );
  };

  const handleEtatFilterClick = (slug: string | null) => {
    if (slug === null) {
      updateFilterUrl({ etat: "", article: null });
    } else {
      updateFilterUrl({ etat: slug, article: null });
    }
  };

  const handleSelect = (id: string) => {
    setSelectedId(id);
    syncSelectedArticleInUrl(id);
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      setIsDrawerOpen(true);
    }
  };

  useEffect(() => {
    if (!selectedId) {
      setIsDrawerOpen(false);
    }
  }, [selectedId]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsDrawerOpen(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const handleEtatUpdated = (etatSlugUpdated: string | null) => {
    const normalizedSlug = normalizeArticleStatusSlug(etatSlugUpdated);
    const targetEtat = etats.find((e) => e.slug === normalizedSlug) ?? null;

    setVisibleArticles((prev) =>
      prev.map((a) =>
        a.id === selectedId
          ? {
              ...a,
              etat: normalizedSlug
                ? {
                    libelle:
                      targetEtat?.libelle ??
                      getArticleStatusLabel(normalizedSlug, "admin") ??
                      a.etat?.libelle ??
                      normalizedSlug,
                    slug: normalizedSlug,
                  }
                : null,
            }
          : a
      )
    );

    setDetail((prev) => {
      if (!prev) return prev;
      if (!normalizedSlug) {
        return { ...prev, etat: null };
      }
      return {
        ...prev,
        etat: {
          libelle:
            targetEtat?.libelle ??
            getArticleStatusLabel(normalizedSlug, "admin") ??
            prev.etat?.libelle ??
            normalizedSlug,
          slug: normalizedSlug,
        },
      };
    });
  };

  // Scroll infini
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

  const sortedEtats = [...etats].sort((a, b) => a.ordre - b.ordre);

  function toggleBulkSelection(id: string) {
    setSelectedBulkIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function toggleBulkAll() {
    if (selectedBulkIds.length === visibleArticles.length) {
      setSelectedBulkIds([]);
    } else {
      setSelectedBulkIds(visibleArticles.map((a) => a.id));
    }
  }

  async function handleBulkEtatChange(targetEtatSlug: string) {
    if (!selectedBulkIds.length) return;
    setRunningBulkAction(true);
    try {
      const responses = await Promise.all(
        selectedBulkIds.map((id) =>
          fetch(`/api/articles/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ etatSlug: targetEtatSlug }),
          })
        )
      );
      if (responses.some((response) => !response.ok)) {
        alert("Impossible de mettre à jour tous les articles sélectionnés.");
        return;
      }
      setSelectedBulkIds([]);
      router.refresh();
    } catch {
      alert("Erreur réseau lors de la mise à jour en masse.");
    } finally {
      setRunningBulkAction(false);
    }
  }

  async function handleBulkDelete() {
    if (!selectedBulkIds.length) {
      return;
    }
    setRunningBulkAction(true);
    const confirmed = window.confirm(
      `Supprimer définitivement ${selectedBulkIds.length} article(s) sélectionné(s) ?`
    );
    if (!confirmed) {
      setRunningBulkAction(false);
      return;
    }
    try {
      await Promise.all(
        selectedBulkIds.map((id) =>
          fetch(`/api/articles/${id}`, { method: "DELETE" })
        )
      );
      const remaining = visibleArticles.filter(
        (a) => !selectedBulkIds.includes(a.id)
      );
      setVisibleArticles(remaining);
      if (selectedId && selectedBulkIds.includes(selectedId)) {
        const nextId = remaining[0]?.id ?? null;
        setSelectedId(nextId);
        syncSelectedArticleInUrl(nextId);
      }
      setBulkMode(false);
      setSelectedBulkIds([]);
      router.refresh();
    } catch {
      alert("Erreur réseau lors de la suppression en masse.");
    } finally {
      setRunningBulkAction(false);
    }
  }

  const bulkActionItems: AdminActionMenuItem[] = sortedEtats.map((etat) => ({
    id: `bulk-${etat.slug}`,
    label: `Passer en ${etat.libelle.toLowerCase()}`,
    onSelect: async () => {
      await handleBulkEtatChange(etat.slug);
    },
  }));
  bulkActionItems.push({
    id: "bulk-delete",
    label: "Supprimer la sélection",
    tone: "danger",
    onSelect: async () => {
      await handleBulkDelete();
    },
  });

  return (
    <>
      {/* Filtres d’état dédiés relecture */}
      <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-rer-muted">
          États
        </span>
        <button
          type="button"
          onClick={() => handleEtatFilterClick(null)}
          className={`chip-filter ${!etatSlug ? "chip-filter--active" : ""}`}
        >
          Tous
        </button>
        {sortedEtats.map((etat) => (
          <button
            key={etat.slug}
            type="button"
            onClick={() => handleEtatFilterClick(etat.slug)}
            className={`chip-filter ${etat.slug === etatSlug ? "chip-filter--active" : ""}`}
          >
            {etat.libelle}
          </button>
        ))}
      </div>

      <div
        className={`grid gap-4 ${
          listCollapsed
            ? "lg:grid-cols-[64px_minmax(0,1fr)]"
            : "lg:grid-cols-[minmax(0,1.3fr)_minmax(0,2fr)]"
        }`}
      >
        <div
          className={`max-h-[calc(100vh-140px)] space-y-2 overflow-y-auto px-2 py-2 transition-all ${
            listCollapsed
              ? "flex min-w-[64px] flex-col items-center gap-2 rounded-lg border border-rer-border bg-rer-app/30"
              : ""
          }`}
        >
          <div className="mb-2 flex items-center gap-2 text-[11px] text-rer-muted">
            {!listCollapsed && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    if (bulkMode) {
                      setBulkMode(false);
                      setSelectedBulkIds([]);
                    } else {
                      setBulkMode(true);
                    }
                  }}
                  className={`btn-action-text ${bulkMode ? "font-semibold text-rer-blue" : ""}`}
                >
                  Sélection multiple
                </button>
                {bulkMode && (
                  <>
                    <button
                      type="button"
                      onClick={toggleBulkAll}
                      className="btn-action"
                    >
                      {selectedBulkIds.length === visibleArticles.length
                        ? "Tout désélectionner"
                        : "Tout sélectionner"}
                    </button>
                    <AdminActionMenu
                      label={
                        selectedBulkIds.length
                          ? `Actions (${selectedBulkIds.length})`
                          : "Actions groupées"
                      }
                      items={bulkActionItems}
                      disabled={selectedBulkIds.length === 0}
                      loading={runningBulkAction}
                    />
                    <span>
                      {selectedBulkIds.length
                        ? `${selectedBulkIds.length} article(s) sélectionné(s)`
                        : "Cliquez sur un article pour le sélectionner"}
                    </span>
                  </>
                )}
              </>
            )}
          </div>
          {listCollapsed ? (
            <div className="flex flex-col items-center justify-center gap-1 py-4 text-center">
              <p className="text-[11px] font-medium text-rer-muted">Liste repliée</p>
              <p className="text-[10px] text-rer-subtle">
                {visibleArticles.length} article{visibleArticles.length !== 1 ? "s" : ""}
              </p>
              <button
                type="button"
                onClick={() => setListCollapsed(false)}
                className="mt-2 text-[11px] text-rer-blue hover:underline"
              >
                Ouvrir la liste
              </button>
            </div>
          ) : visibleArticles.length === 0 ? (
            <p className="rounded-lg bg-white px-3 py-6 text-center text-sm text-rer-muted shadow-sm ring-1 ring-rer-border">
              Aucun article ne correspond à ces critères. Essayez d&apos;élargir
              votre recherche ou de modifier les filtres.
            </p>
          ) : (
            <>
              {visibleArticles.map((article) => {
                const isSelected = article.id === selectedId;
                const isBulkSelected = selectedBulkIds.includes(article.id);
                const ageLabel = (() => {
                      const refDate = article.dateDepot ?? article.createdAt;
                  if (!refDate) return "";
                  const d = new Date(refDate);
                  const diff = Date.now() - d.getTime();
                  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                  if (days <= 0) return "aujourd’hui";
                  if (days === 1) return "il y a 1 jour";
                  return `il y a ${days} jours`;
                })();

                return (
                  <button
                    key={article.id}
                    type="button"
                    onClick={() =>
                      bulkMode
                        ? toggleBulkSelection(article.id)
                        : handleSelect(article.id)
                    }
                    aria-pressed={isSelected}
                    className={`flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left text-xs transition-colors ${
                      isSelected && !bulkMode
                        ? "bg-rer-blue/5 ring-1 ring-rer-blue"
                        : "bg-white hover:bg-rer-app hover:ring-1 hover:ring-rer-border"
                    }`}
                  >
                    {bulkMode && (
                      <span
                        className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full border ${
                          isBulkSelected
                            ? "border-rer-blue bg-rer-blue"
                            : "border-rer-border bg-white"
                        }`}
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      {/* Ligne 1 : badge + titre à gauche, date à droite */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex min-w-0 flex-wrap items-center gap-2">
                          {article.etat && (
                            <span
                              className={`${getEtatBadgeClasses(
                                article.etat.slug,
                                false
                              )} shrink-0 whitespace-nowrap`}
                            >
                              {getArticleStatusLabel(
                                article.etat.slug,
                                "admin"
                              ) ?? article.etat.libelle}
                            </span>
                          )}
                          <p className="line-clamp-2 text-sm font-semibold text-rer-text">
                            {article.titre}
                          </p>
                        </div>
                        <span className="shrink-0 text-[10px] text-rer-subtle">
                          {ageLabel}
                        </span>
                      </div>
                      {article.chapo && (
                        <p className="mt-0.5 line-clamp-1 text-[11px] text-rer-muted">
                          {article.chapo}
                        </p>
                      )}
                      <p className="mt-1 flex items-center gap-1 text-[10px] text-rer-subtle">
                        <span
                          className="h-[3px] w-[3px] rounded-full bg-rer-subtle"
                          aria-hidden="true"
                        />
                        <span className="line-clamp-1">
                          {[
                            article.auteur && `${article.auteur.prenom} ${article.auteur.nom}`,
                            article.rubrique?.libelle,
                            article.format?.libelle,
                          ]
                            .filter(Boolean)
                            .join(" · ") || "—"}
                        </span>
                      </p>
                      {bulkMode && isBulkSelected && (
                        <span className="mt-0.5 inline-block rounded-lg bg-rer-blue/10 px-2 py-0.5 text-[10px] text-rer-blue">
                          Sélectionné
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
              <div ref={sentinelRef} className="h-6 lg:h-8" />
            </>
          )}
        </div>

        <div className="hidden min-h-[260px] min-w-0 flex-col rounded-xl bg-white p-4 shadow-sm ring-1 ring-rer-border lg:flex lg:min-w-[420px]">
          {!selectedId && (
            <p className="text-sm text-rer-muted">
              Sélectionnez un article dans la file pour le relire.
            </p>
          )}

          {selectedId && !isDrawerOpen && (
            <AdminArticlePanel
              selectedId={selectedId}
              selectedArticle={selectedArticle}
              detail={detail}
              loading={loading}
              error={error}
              etats={etats}
              onEtatUpdated={handleEtatUpdated}
              onDetailUpdated={setDetail}
              listCollapsed={listCollapsed}
              onToggleListCollapsed={() => setListCollapsed((v) => !v)}
              showListToggle
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
                Relecture article
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
              <AdminArticlePanel
                selectedId={selectedId}
                selectedArticle={selectedArticle}
                detail={detail}
                loading={loading}
                error={error}
                etats={etats}
                onEtatUpdated={handleEtatUpdated}
                onDetailUpdated={setDetail}
                listCollapsed={listCollapsed}
                onToggleListCollapsed={() => setListCollapsed((v) => !v)}
                showListToggle={false}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

