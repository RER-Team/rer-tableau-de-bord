"use client";

import { useEffect, useRef, useState } from "react";
import {
  getFormatBadgeClasses,
  getRubriqueBadgeClasses,
} from "@/app/articles/ArticlesCardsExplorer";
import RichArticleEditor from "./RichArticleEditor";

export type ArticleEditorValue = {
  formatId: string;
  rubriqueId: string;
  auteurId: string;
  mutuelleId?: string;
  lienPhoto?: string | null;
  legendePhoto?: string;
  creditPhoto?: string;
  titre: string;
  contenuHtml: string;
  contenuJson?: unknown | null;
  postRs?: string;
};

export type ArticleEditorReferentiels = {
  auteurs: { id: string; prenom: string; nom: string; mutuelleId?: string | null }[];
  mutuelles: { id: string; nom: string }[];
  rubriques: { id: string; libelle: string }[];
  formats: { id: string; libelle: string; signesReference: number | null; hasChapo?: boolean }[];
};

type ArticleEditorCardProps = {
  mode?: "create" | "edit";
  value: ArticleEditorValue;
  referentiels: ArticleEditorReferentiels;
  onChange: (patch: Partial<ArticleEditorValue>) => void;
  onUploadMainImage: (file: File) => Promise<void>;
  editorKey?: number;
  uploadingImage?: boolean;
  uploadError?: string | null;
};

export function ArticleEditorCard({
  mode = "create",
  value,
  referentiels,
  onChange,
  onUploadMainImage,
  editorKey,
  uploadingImage = false,
  uploadError = null,
}: ArticleEditorCardProps) {
  const {
    formatId,
    rubriqueId,
    auteurId,
    mutuelleId,
    lienPhoto,
    legendePhoto,
    creditPhoto,
    titre,
    contenuHtml,
    contenuJson,
    postRs,
  } = value;

  const signesRef = referentiels.formats.find((f) => f.id === formatId)?.signesReference;
  const plainFromHtml = (contenuHtml || "").replace(/<[^>]+>/g, " ");
  const signesCount = (plainFromHtml + (titre || "")).replace(/\s/g, "").length;

  const selectedAuteur: any =
    (referentiels.auteurs as any[]).find((a) => a.id === auteurId) ?? null;
  const selectedMutuelleName: string | null = (() => {
    const auteurMutuelleId =
      (selectedAuteur?.mutuelleId as string | undefined | null) ?? null;
    const effectiveMutuelleId = mutuelleId || auteurMutuelleId;
    if (!effectiveMutuelleId) return null;
    const m = referentiels.mutuelles.find((m) => m.id === effectiveMutuelleId);
    return m?.nom ?? null;
  })();

  const titleRef = useRef<HTMLTextAreaElement | null>(null);
  const editorDebounceRef = useRef<number | null>(null);
  const lastEditorHtmlRef = useRef(contenuHtml || "");
  const titleFocusedRef = useRef(false);
  const postRsFocusedRef = useRef(false);
  const legendeFocusedRef = useRef(false);
  const creditFocusedRef = useRef(false);
  const [openDropdown, setOpenDropdown] = useState<"format" | "rubrique" | "auteur" | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const [titleDraft, setTitleDraft] = useState(titre);
  const [postRsDraft, setPostRsDraft] = useState(postRs || "");
  const [legendeDraft, setLegendeDraft] = useState(legendePhoto || "");
  const [creditDraft, setCreditDraft] = useState(creditPhoto || "");

  const hasMissingMeta = !formatId || !rubriqueId || !auteurId;
  const selectedFormat = referentiels.formats.find((fmt) => fmt.id === formatId);
  const hasChapo = selectedFormat?.hasChapo ?? true;

  useEffect(() => {
    if (openDropdown === null) return;
    const close = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener("click", close, true);
    return () => document.removeEventListener("click", close, true);
  }, [openDropdown]);

  useEffect(() => {
    const el = titleRef.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${el.scrollHeight}px`;
  }, [titleDraft]);

  useEffect(() => {
    if (!titleFocusedRef.current) {
      setTitleDraft(titre);
    }
  }, [titre]);

  useEffect(() => {
    if (!postRsFocusedRef.current) {
      setPostRsDraft(postRs || "");
    }
  }, [postRs]);

  useEffect(() => {
    if (!legendeFocusedRef.current) {
      setLegendeDraft(legendePhoto || "");
    }
  }, [legendePhoto]);

  useEffect(() => {
    if (!creditFocusedRef.current) {
      setCreditDraft(creditPhoto || "");
    }
  }, [creditPhoto]);

  useEffect(() => {
    lastEditorHtmlRef.current = contenuHtml || "";
  }, [contenuHtml]);

  useEffect(() => {
    return () => {
      if (editorDebounceRef.current) {
        window.clearTimeout(editorDebounceRef.current);
      }
    };
  }, []);

  const handleClearMainImage = () => {
    onChange({ lienPhoto: null, legendePhoto: "", creditPhoto: "" });
  };

  const handleChooseMainImage = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async (e: Event) => {
      const target = e.target as HTMLInputElement | null;
      const file = target?.files?.[0];
      if (!file) return;
      await onUploadMainImage(file);
    };
    input.click();
  };

  return (
    <div className="space-y-6">
      {/* Bloc image principale */}
      <section className="rounded-2xl border border-rer-border bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-2 text-xs text-rer-muted">
          <span className="font-medium">Image principale</span>
          {lienPhoto && (
            <button
              type="button"
              onClick={handleClearMainImage}
              className="text-[11px] text-red-500 hover:underline"
            >
              Retirer l’image
            </button>
          )}
        </div>
        <div
          role="button"
          tabIndex={0}
          onClick={(e) => {
            const target = e.target as HTMLElement | null;
            if (target && target.closest("button, input, textarea")) return;
            handleChooseMainImage();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              handleChooseMainImage();
            }
          }}
          className="rounded-xl border-2 border-dashed border-rer-border bg-rer-app/40 px-4 py-4 text-xs text-rer-muted"
        >
          {uploadingImage ? (
            <div className="flex h-64 items-center justify-center">
              <p>Import de l’image…</p>
            </div>
          ) : lienPhoto ? (
            <div className="overflow-hidden rounded-xl border border-rer-border bg-rer-app">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={lienPhoto}
                alt={legendePhoto || ""}
                className="h-auto max-h-80 w-full object-contain"
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-2 text-center">
              <p>Glissez-déposez une image ici ou cliquez pour choisir un fichier.</p>
            </div>
          )}
        </div>
        {uploadError && !uploadingImage && (
          <p className="mt-2 text-xs text-red-600">{uploadError}</p>
        )}
        {lienPhoto && (
          <div className="mt-3">
            <input
              type="text"
              value={legendeDraft}
              onFocus={() => {
                legendeFocusedRef.current = true;
              }}
              onBlur={() => {
                legendeFocusedRef.current = false;
                if ((legendePhoto || "") !== legendeDraft) {
                  onChange({ legendePhoto: legendeDraft });
                }
              }}
              onChange={(e) => setLegendeDraft(e.target.value)}
              placeholder="Légende de l’image principale…"
              className="w-full rounded-lg border border-rer-border px-2 py-1 text-xs text-rer-text placeholder:text-rer-muted focus:border-rer-blue focus:outline-none focus:ring-1 focus:ring-rer-blue"
            />
            <input
              type="text"
              value={creditDraft}
              onFocus={() => {
                creditFocusedRef.current = true;
              }}
              onBlur={() => {
                creditFocusedRef.current = false;
                if ((creditPhoto || "") !== creditDraft) {
                  onChange({ creditPhoto: creditDraft });
                }
              }}
              onChange={(e) => setCreditDraft(e.target.value)}
              placeholder="Crédit photo (ex: © Prénom Nom)…"
              className="mt-2 w-full rounded-lg border border-rer-border px-2 py-1 text-xs italic text-rer-muted placeholder:text-rer-muted focus:border-rer-blue focus:outline-none focus:ring-1 focus:ring-rer-blue"
            />
          </div>
        )}
      </section>

      {/* Carte principale : méta + titre + contenu */}
      <section className="rounded-2xl border border-rer-border bg-white p-5 shadow-sm">
        <div className="space-y-5">
          <div
            ref={dropdownRef}
            className={`rounded-xl border px-3 py-3 text-xs ${
              hasMissingMeta
                ? "border-amber-200 bg-amber-50/80"
                : "border-rer-border bg-rer-app/40"
            }`}
          >
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-rer-muted">
              Paramètres de l’article
            </p>
            <div className="flex flex-wrap items-center gap-3">
            {/* Format — style outline, flèche à l’intérieur, fermeture après sélection */}
            <div className="relative inline-flex">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenDropdown(openDropdown === "format" ? null : "format");
                }}
                className={`inline-flex min-w-0 max-w-[240px] cursor-pointer list-none items-center rounded-lg px-3 py-1.5 text-[12px] font-medium ${
                  formatId
                    ? (() => {
                        const f = referentiels.formats.find((fmt) => fmt.id === formatId);
                        return f
                          ? getFormatBadgeClasses(f.libelle)
                          : "border border-rer-border bg-rer-app text-rer-muted";
                      })()
                    : hasMissingMeta
                    ? "border border-amber-300 bg-white text-rer-muted"
                    : "border border-rer-border bg-rer-app text-rer-muted"
                }`}
              >
                <span className="truncate">
                  {formatId
                    ? (() => {
                        const f = referentiels.formats.find((fmt) => fmt.id === formatId);
                        if (!f) return "Choisir un format";
                        const extra = f.signesReference != null ? ` (${f.signesReference} signes)` : "";
                        return `${f.libelle}${extra}`;
                      })()
                    : "Choisir un format"}
                </span>
                <span className="ml-1 shrink-0 text-[9px] text-rer-muted" aria-hidden>▾</span>
              </button>
              {openDropdown === "format" && (
                <div className="absolute left-0 top-full z-20 mt-1 w-64 rounded-lg border border-rer-border bg-white py-1 text-[12px] shadow-lg">
                  {referentiels.formats.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onChange({ formatId: f.id });
                        setOpenDropdown(null);
                      }}
                      className={`flex w-full items-center justify-between rounded-lg px-3 py-1.5 text-left hover:bg-rer-app ${
                        formatId === f.id ? "font-semibold text-rer-blue bg-rer-app/50" : "text-rer-text"
                      }`}
                    >
                      <span>{f.libelle}</span>
                      {f.signesReference != null && (
                        <span className="ml-2 text-[11px] text-rer-muted">{f.signesReference} signes</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Rubrique — style plein, flèche à l’intérieur, fermeture après sélection */}
            <div className="relative inline-flex">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenDropdown(openDropdown === "rubrique" ? null : "rubrique");
                }}
                className={`inline-flex min-w-0 max-w-[220px] cursor-pointer list-none items-center rounded-lg px-3 py-1.5 text-[12px] font-medium ${
                  rubriqueId
                    ? (() => {
                        const r = referentiels.rubriques.find((rb) => rb.id === rubriqueId);
                        return r ? getRubriqueBadgeClasses(r.libelle) : "border border-rer-border bg-rer-app text-rer-muted";
                      })()
                    : hasMissingMeta
                    ? "border border-amber-300 bg-white text-rer-muted"
                    : "border border-rer-border bg-rer-app text-rer-muted"
                }`}
              >
                <span className="truncate">
                  {rubriqueId
                    ? referentiels.rubriques.find((rb) => rb.id === rubriqueId)?.libelle ?? "Choisir une rubrique"
                    : "Choisir une rubrique"}
                </span>
                <span className="ml-1 shrink-0 text-[9px] opacity-80" aria-hidden>▾</span>
              </button>
              {openDropdown === "rubrique" && (
                <div className="absolute left-0 top-full z-20 mt-1 w-56 rounded-lg border border-rer-border bg-white py-1 text-[12px] shadow-lg">
                  {referentiels.rubriques.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onChange({ rubriqueId: r.id });
                        setOpenDropdown(null);
                      }}
                      className={`flex w-full items-center rounded-lg px-3 py-1.5 text-left hover:bg-rer-app ${
                        rubriqueId === r.id ? "font-semibold text-rer-blue bg-rer-app/50" : "text-rer-text"
                      }`}
                    >
                      {r.libelle}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Signature — flèche à l’intérieur, fermeture après sélection */}
            <div className="relative inline-flex">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenDropdown(openDropdown === "auteur" ? null : "auteur");
                }}
                className={`inline-flex min-w-0 max-w-[260px] cursor-pointer list-none items-center rounded-lg border px-3 py-1.5 text-[12px] font-medium text-rer-text ${
                  auteurId
                    ? "border-rer-border bg-rer-app"
                    : hasMissingMeta
                    ? "border-amber-300 bg-white"
                    : "border-rer-border bg-rer-app"
                }`}
              >
                <span className="truncate">
                  {auteurId
                    ? (() => {
                        const a = (referentiels.auteurs as any[]).find((aut) => aut.id === auteurId);
                        if (!a) return "Choisir une signature";
                        return selectedMutuelleName ? `${a.prenom} ${a.nom} – ${selectedMutuelleName}` : `${a.prenom} ${a.nom}`;
                      })()
                    : "Choisir une signature"}
                </span>
                <span className="ml-1 shrink-0 text-[9px] text-rer-muted" aria-hidden>▾</span>
              </button>
              {openDropdown === "auteur" && (
                <div className="absolute left-0 top-full z-20 mt-1 w-64 rounded-lg border border-rer-border bg-white py-1 text-[12px] shadow-lg">
                  {referentiels.auteurs.map((a) => {
                    const mId = (a as any).mutuelleId as string | undefined;
                    const mutuelle = mId && referentiels.mutuelles.find((m) => m.id === mId)?.nom;
                    const label = mutuelle ? `${a.prenom} ${a.nom} – ${mutuelle}` : `${a.prenom} ${a.nom}`;
                    return (
                      <button
                        key={a.id}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onChange({ auteurId: a.id, mutuelleId: mId || undefined });
                          setOpenDropdown(null);
                        }}
                        className={`flex w-full items-center rounded-lg px-3 py-1.5 text-left hover:bg-rer-app ${
                          auteurId === a.id ? "font-semibold text-rer-blue bg-rer-app/50" : "text-rer-text"
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            </div>
            {hasMissingMeta && (
              <p className="mt-2 text-[11px] text-amber-800">
                Commencez par choisir un format, une rubrique et une signature.
              </p>
            )}
          </div>

          <div className="space-y-3">
            <textarea
              ref={titleRef}
              value={titleDraft}
              onFocus={() => {
                titleFocusedRef.current = true;
              }}
              onBlur={() => {
                titleFocusedRef.current = false;
                if (titre !== titleDraft) {
                  onChange({ titre: titleDraft });
                }
              }}
              onChange={(e) => setTitleDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  const proseMirror =
                    document.querySelector<HTMLElement>(".ProseMirror");
                  proseMirror?.focus();
                }
              }}
              required
              placeholder="Titre de l’article"
              rows={1}
              className="w-full resize-none border-none bg-transparent text-3xl font-semibold leading-tight text-rer-text placeholder:text-rer-muted focus:outline-none focus:ring-0"
            />
            <p className="inline-flex items-center rounded-lg border border-dashed border-rer-border bg-rer-app/40 px-2 py-1 text-[11px] text-rer-muted">
              Astuce&nbsp;: sur une ligne vide dans le texte, tapez «&nbsp;/&nbsp;» pour insérer
              une image, un embed ou appliquer un style (H2, H3, citation).
            </p>
            <div
              className="rounded-xl border border-rer-border/40 bg-white/95 p-3"
              onClick={() => {
                const proseMirror =
                  document.querySelector<HTMLElement>(".ProseMirror");
                proseMirror?.focus();
              }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  const proseMirror =
                    document.querySelector<HTMLElement>(".ProseMirror");
                  proseMirror?.focus();
                }
              }}
            >
              <RichArticleEditor
                key={editorKey}
                chrome="none"
                initialHtml={contenuHtml}
                initialJson={contenuJson ?? undefined}
                onChange={({ json, html }) => {
                  if (editorDebounceRef.current) {
                    window.clearTimeout(editorDebounceRef.current);
                  }
                  editorDebounceRef.current = window.setTimeout(() => {
                    if (lastEditorHtmlRef.current === html) return;
                    lastEditorHtmlRef.current = html;
                    onChange({ contenuJson: json, contenuHtml: html });
                  }, 500);
                }}
                className="min-h-[420px]"
                hasChapo={hasChapo}
              />
            </div>
          </div>

          {signesRef != null && (
            <div
              className={`flex items-center justify-end text-[11px] ${
                signesCount > (signesRef ?? 0) ? "text-red-600 font-medium" : "text-gray-500"
              }`}
            >
              <span>
                Signes : {signesCount} / {signesRef}{" "}
                {typeof signesRef === "number" &&
                  `(${signesRef - signesCount} restants)${
                    signesCount > signesRef ? " – au‑delà du format" : ""
                  }`}
              </span>
            </div>
          )}
        </div>
      </section>

      {/* Bloc Post réseaux sociaux */}
      <section className="rounded-2xl border border-rer-border bg-white p-4 shadow-sm">
        <div className="rounded-lg bg-rer-app p-3">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Post réseaux sociaux
          </p>
          <textarea
            value={postRsDraft}
            onFocus={() => {
              postRsFocusedRef.current = true;
            }}
            onBlur={() => {
              postRsFocusedRef.current = false;
              if ((postRs || "") !== postRsDraft) {
                onChange({ postRs: postRsDraft });
              }
            }}
            onChange={(e) => setPostRsDraft(e.target.value)}
            rows={4}
            placeholder="Proposition de texte pour les réseaux sociaux…"
            className="w-full resize-none rounded-lg border border-rer-border bg-white px-2 py-1 text-sm text-rer-text placeholder:text-rer-muted focus:border-rer-blue focus:outline-none focus:ring-1 focus:ring-rer-blue"
          />
        </div>
      </section>
    </div>
  );
}

export default ArticleEditorCard;

