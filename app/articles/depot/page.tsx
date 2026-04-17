"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ArticleEditorCard, {
  ArticleEditorReferentiels,
  ArticleEditorValue,
} from "../../components/ArticleEditorCard";
import { ingestDebug } from "@/lib/ingest-debug";

type Referentiels = ArticleEditorReferentiels & {
  etats: { id: string; slug: string; libelle: string }[];
};

type ImportWordResponse = {
  titre?: string;
  chapo?: string;
  contenu: string;
};

export default function DepotPage() {
  const router = useRouter();
  const [ref, setRef] = useState<Referentiels | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitStatus, setSubmitStatus] = useState<"idle" | "sending" | "ok" | "error">("idle");
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mainImageInputRef = useRef<HTMLInputElement>(null);
  const draftSaveTimeoutRef = useRef<number | null>(null);
  const restoringDraftRef = useRef(false);
  const restoredOnceRef = useRef(false);

  const [titre, setTitre] = useState("");
  const [contenuJson, setContenuJson] = useState<unknown | null>(null);
  const [contenuHtml, setContenuHtml] = useState("");
  const [auteurId, setAuteurId] = useState("");
  const [mutuelleId, setMutuelleId] = useState("");
  const [rubriqueId, setRubriqueId] = useState("");
  const [formatId, setFormatId] = useState("");
  const [draftId, setDraftId] = useState<string | null>(null);
  const [draftStatus, setDraftStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [session, setSession] = useState<{ user?: { auteurId?: string | null; role?: string | null } } | null>(
    null
  );
  const [lienPhoto, setLienPhoto] = useState<string | null>(null);
  const [legendePhoto, setLegendePhoto] = useState<string>("");
  const [creditPhoto, setCreditPhoto] = useState<string>("");
  const [isMainImageDragOver, setIsMainImageDragOver] = useState(false);
  const [postRs, setPostRs] = useState<string>("");
  const [editorResetKey, setEditorResetKey] = useState(0);
  const [formatMenuOpen, setFormatMenuOpen] = useState(false);
  const [rubriqueMenuOpen, setRubriqueMenuOpen] = useState(false);
  const [signatureMenuOpen, setSignatureMenuOpen] = useState(false);
  const [uploadingMainImage, setUploadingMainImage] = useState(false);
  const [uploadMainImageError, setUploadMainImageError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/referentiels")
      .then((r) => r.json())
      .then((data) => {
        setRef(data);
      })
      .catch(() => setRef(null))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((data) => setSession(data ?? null))
      .catch(() => setSession(null));
  }, []);

  // Auto‑sélection de l’auteur connecté et, si possible, de sa mutuelle.
  useEffect(() => {
    if (!ref || !session) return;
    const auteurSessionId = (session.user as any)?.auteurId as string | undefined;
    if (auteurSessionId && !auteurId) {
      setAuteurId(auteurSessionId);
    }
    if (!mutuelleId && auteurSessionId) {
      const auteur = (ref.auteurs as any[]).find((a) => a.id === auteurSessionId);
      const mId = auteur?.mutuelleId as string | undefined;
      if (mId) {
        setMutuelleId(mId);
      }
    }
  }, [ref, session, auteurId, mutuelleId]);

  // Récupération d’un brouillon existant (dernier brouillon de l’utilisateur).
  useEffect(() => {
    if (!ref || !auteurId) return;
    if (restoredOnceRef.current) return;
    restoredOnceRef.current = true;
    if (titre.trim() || contenuHtml.trim()) return;

    restoringDraftRef.current = true;
    (async () => {
      try {
        const listRes = await fetch("/api/articles?mine=1&etat=brouillon&limit=1");
        if (!listRes.ok) return;
        const listData = await listRes.json().catch(() => null);
        const draftSummary = (listData?.articles?.[0] ?? null) as { id?: string } | null;
        const id = draftSummary?.id ? String(draftSummary.id) : "";
        if (!id) return;

        const detailRes = await fetch(`/api/articles/${id}`);
        if (!detailRes.ok) return;
        const detail = await detailRes.json().catch(() => null);
        if (!detail) return;

        // Ne pas écraser si l’utilisateur a déjà commencé à saisir.
        if (titre.trim() || contenuHtml.trim()) return;

        setDraftId(id);
        setTitre((detail.titre ?? "").trim() === "Sans titre" ? "" : (detail.titre ?? ""));
        setContenuHtml(detail.contenu ?? "");
        setContenuJson(detail.contenuJson ?? null);
        if (detail.formatId) setFormatId(detail.formatId);
        if (detail.rubriqueId) setRubriqueId(detail.rubriqueId);
        if (detail.mutuelleId) setMutuelleId(detail.mutuelleId);
        setLienPhoto(detail.lienPhoto ?? null);
        setLegendePhoto(detail.legendePhoto ?? "");
        setCreditPhoto(detail.creditPhoto ?? "");
        setPostRs(detail.postRs ?? "");
        setDraftStatus("saved");
      } finally {
        restoringDraftRef.current = false;
      }
    })();
  }, [ref, auteurId, titre, contenuHtml]);

  // Autosave brouillon (debounce)
  useEffect(() => {
    if (!ref || !auteurId) return;
    if (restoringDraftRef.current) return;
    if (submitStatus === "sending") return;

    const hasSomething = !!(titre.trim() || contenuHtml.trim());
    if (!hasSomething) return;

    if (draftSaveTimeoutRef.current) {
      window.clearTimeout(draftSaveTimeoutRef.current);
    }

    draftSaveTimeoutRef.current = window.setTimeout(async () => {
      setDraftStatus("saving");
      try {
        const payload = {
          titre,
          contenuHtml: contenuHtml || "<p></p>",
          contenuJson,
          auteurId,
          mutuelleId: mutuelleId || undefined,
          rubriqueId: rubriqueId || undefined,
          formatId: formatId || undefined,
          lienPhoto: lienPhoto || undefined,
          legendePhoto: legendePhoto || undefined,
          creditPhoto: creditPhoto || undefined,
          postRs: postRs || undefined,
          etatSlug: "brouillon",
          isDraft: true,
        };

        const res = await fetch(draftId ? `/api/articles/${draftId}` : "/api/articles", {
          method: draftId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          setDraftStatus("error");
          return;
        }
        const data = await res.json().catch(() => null);
        if (!draftId && data?.id) {
          setDraftId(String(data.id));
        }
        setDraftStatus("saved");
      } catch {
        setDraftStatus("error");
      }
    }, 1800);

    return () => {
      if (draftSaveTimeoutRef.current) {
        window.clearTimeout(draftSaveTimeoutRef.current);
      }
    };
  }, [
    ref,
    auteurId,
    draftId,
    titre,
    contenuHtml,
    contenuJson,
    mutuelleId,
    rubriqueId,
    formatId,
    submitStatus,
    lienPhoto,
    legendePhoto,
    creditPhoto,
    postRs,
  ]);

  const handleImportWord = () => {
    fileInputRef.current?.click();
  };

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setImporting(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/import-word", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.error || "Erreur lors de l’import.");
        return;
      }
      const data: ImportWordResponse = await res.json();
      if (data.titre != null) setTitre(data.titre);
      // Si un chapô est fourni, on l'intègre directement dans le contenu
      // comme premier paragraphe marqué en chapô.
      const importedChapo = (data.chapo ?? "").trim();
      const importedContenu = data.contenu ?? "";
      const chapoHtml = importedChapo
        ? `<p class="chapo">${importedChapo}</p>`
        : "";
      setContenuJson(null);
      setContenuHtml(`${chapoHtml}${importedContenu}`);
    } catch {
      alert("Erreur lors de l’import.");
    } finally {
      setImporting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auteurId) {
      alert("Veuillez sélectionner un auteur.");
      return;
    }
    if (!formatId) {
      alert("Veuillez sélectionner un format.");
      return;
    }
    if (!rubriqueId) {
      alert("Veuillez sélectionner une rubrique.");
      return;
    }
    const html = contenuHtml.trim();
    if (!html) {
      alert("Merci de saisir le contenu de l’article.");
      return;
    }
    setSubmitStatus("sending");
    try {
      // #region agent log
      ingestDebug({
        sessionId: "a34272",
        runId: "pre-fix",
        hypothesisId: "H_DEPOT_SUBMIT",
        location: "app/articles/depot/page.tsx:handleSubmit:beforeFetch",
        message: "Submitting new article",
        data: {
          titreLength: titre.length,
          htmlLength: html.length,
          hasImgTag: html.includes("<img"),
        },
      });
      // #endregion

      const res = await fetch(draftId ? `/api/articles/${draftId}` : "/api/articles", {
        method: draftId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titre,
          contenuHtml: html,
          contenuJson,
          auteurId,
          mutuelleId: mutuelleId || undefined,
          rubriqueId: rubriqueId || undefined,
          formatId: formatId || undefined,
          lienPhoto: lienPhoto || undefined,
          legendePhoto: legendePhoto || undefined,
          creditPhoto: creditPhoto || undefined,
          postRs: postRs || undefined,
          etatSlug: "a_relire",
          isDraft: false,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setSubmitStatus("error");
        alert(err.error || "Erreur lors de l’envoi.");
        return;
      }
      const saved = await res.json().catch(() => null);
      const newId = saved?.id ? String(saved.id) : null;
      setSubmitStatus("ok");
      setDraftId(null);
      setDraftStatus("idle");
      setTitre("");
      setContenuHtml("");
      setContenuJson(null);
      setLienPhoto(null);
      setLegendePhoto("");
      setCreditPhoto("");
      setPostRs("");
      if (newId) {
        router.push(`/mes-articles`);
      } else {
        router.push(`/mes-articles`);
      }
    } catch {
      setSubmitStatus("error");
      alert("Erreur réseau.");
    }
  };

  if (loading || !ref) {
    return (
      <div className="p-6">
        <p>Chargement des données…</p>
      </div>
    );
  }

  const performMainImageUpload = async (file: File) => {
    setUploadingMainImage(true);
    setUploadMainImageError(null);
    try {
      const { uploadArticleImage } = await import("@/lib/uploadArticleImage");
      const { publicUrl } = await uploadArticleImage({
        file,
        filename: file.name,
        articleId: draftId ?? undefined,
      });
      setLienPhoto(publicUrl);
    } catch (error) {
      console.error(error);
      const message =
        error instanceof Error && error.message
          ? error.message
          : "Erreur lors de l’upload de l’image principale.";
      setUploadMainImageError(message);
    } finally {
      setUploadingMainImage(false);
    }
  };

  const handleMainImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    await performMainImageUpload(file);
  };

  const handleIgnoreDraft = () => {
    setDraftId(null);
    setDraftStatus("idle");
    setTitre("");
    setContenuHtml("");
    setContenuJson(null);
    setLienPhoto(null);
    setLegendePhoto("");
    setCreditPhoto("");
    setPostRs("");
    setFormatId("");
    setRubriqueId("");
    // On ne touche pas à l'auteur sélectionné pour éviter de casser l'auto-sélection.
    setEditorResetKey((prev) => prev + 1);
  };

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <div className="mb-4 flex items-center justify-between gap-3">
        <Link href="/articles" className="text-sm font-medium text-rer-blue hover:underline">
          ← Liste
        </Link>
        <div className="flex flex-1 items-center justify-end gap-4 text-xs">
          <span className="text-rer-muted">
            {draftStatus === "saving"
              ? "Brouillon…"
              : draftStatus === "saved"
              ? "Brouillon enregistré"
              : draftStatus === "error"
              ? "Brouillon en erreur"
              : ""}
          </span>
          <div className="flex items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept=".docx"
              className="hidden"
              onChange={onFileChange}
            />
            <button
              type="button"
              onClick={handleImportWord}
              disabled={importing}
              className="btn-action disabled:opacity-50"
            >
              {importing ? "Import Word…" : "Importer un Word"}
            </button>
            {draftId && draftStatus === "saved" && (
              <button
                type="button"
                onClick={handleIgnoreDraft}
                className="inline-flex items-center rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-[11px] font-medium text-red-600 hover:bg-red-100"
              >
                Ignorer ce brouillon
              </button>
            )}
          </div>
        </div>
      </div>
      <form id="article-depot-form" onSubmit={handleSubmit} className="space-y-6 pb-24">
        {session?.user?.role === "auteur" && !session?.user?.auteurId && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            Votre compte n&apos;est pas lié à un profil auteur. Contactez un administrateur avant de déposer un article.
          </div>
        )}
        <ArticleEditorCard
          mode="create"
          value={{
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
          }}
          referentiels={ref}
          uploadingImage={uploadingMainImage}
          uploadError={uploadMainImageError}
          onChange={(patch: Partial<ArticleEditorValue>) => {
            if (patch.formatId !== undefined) setFormatId(patch.formatId);
            if (patch.rubriqueId !== undefined) setRubriqueId(patch.rubriqueId);
            if (patch.auteurId !== undefined) setAuteurId(patch.auteurId);
            if (patch.mutuelleId !== undefined) setMutuelleId(patch.mutuelleId || "");
            if (patch.lienPhoto !== undefined) setLienPhoto(patch.lienPhoto ?? null);
            if (patch.legendePhoto !== undefined) setLegendePhoto(patch.legendePhoto || "");
            if (patch.creditPhoto !== undefined) setCreditPhoto(patch.creditPhoto || "");
            if (patch.titre !== undefined) setTitre(patch.titre);
            if (patch.contenuHtml !== undefined) setContenuHtml(patch.contenuHtml);
            if (patch.contenuJson !== undefined) setContenuJson(patch.contenuJson ?? null);
            if (patch.postRs !== undefined) setPostRs(patch.postRs || "");
          }}
          onUploadMainImage={performMainImageUpload}
          editorKey={editorResetKey}
        />

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={submitStatus === "sending" || (session?.user?.role === "auteur" && !session?.user?.auteurId)}
            className="btn-cta disabled:opacity-50"
          >
            {submitStatus === "sending" ? "Envoi…" : "Déposer l’article"}
          </button>
          {submitStatus === "ok" && (
            <span className="text-sm text-green-600">
              Article déposé (état « Soumis à relecture »).
            </span>
          )}
          {submitStatus === "error" && (
            <span className="text-sm text-red-600">Erreur lors de l’envoi.</span>
          )}
        </div>
      </form>
      <button
        type="submit"
        form="article-depot-form"
        disabled={submitStatus === "sending" || (session?.user?.role === "auteur" && !session?.user?.auteurId)}
        className="btn-cta fixed bottom-6 right-6 z-40 hidden rounded-full px-5 py-3 shadow-lg disabled:opacity-50 lg:inline-flex"
      >
        {submitStatus === "sending" ? "Envoi…" : "Déposer l’article"}
      </button>
    </div>
  );
}
