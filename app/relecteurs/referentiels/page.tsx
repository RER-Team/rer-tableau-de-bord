"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

type Mutuelle = { id: string; nom: string };
type Rubrique = { id: string; libelle: string };
type Format = {
  id: string;
  libelle: string;
  signesReference: number | null;
  hasChapo: boolean;
};
type SiteLogoPayload = {
  logoUrl: string;
  hasCustomLogo: boolean;
  updatedAt: number | null;
};

export default function AdminReferentielsPage() {
  const [mutuelles, setMutuelles] = useState<Mutuelle[]>([]);
  const [rubriques, setRubriques] = useState<Rubrique[]>([]);
  const [formats, setFormats] = useState<Format[]>([]);
  const [logo, setLogo] = useState<SiteLogoPayload>({
    logoUrl: "/default-logo.svg",
    hasCustomLogo: false,
    updatedAt: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoMessage, setLogoMessage] = useState<string | null>(null);
  const [logoInputKey, setLogoInputKey] = useState(0);

  const [newMutuelleNom, setNewMutuelleNom] = useState("");
  const [newRubriqueLibelle, setNewRubriqueLibelle] = useState("");
  const [newFormatLibelle, setNewFormatLibelle] = useState("");
  const [newFormatSignes, setNewFormatSignes] = useState("");
  const [newFormatHasChapo, setNewFormatHasChapo] = useState(true);

  useEffect(() => {
    const run = async () => {
      try {
        const [mRes, rRes, fRes, logoRes] = await Promise.all([
          fetch("/api/admin/mutuelles"),
          fetch("/api/admin/rubriques"),
          fetch("/api/admin/formats"),
          fetch("/api/admin/logo", { cache: "no-store" }),
        ]);
        if (!mRes.ok || !rRes.ok || !fRes.ok || !logoRes.ok) {
          throw new Error("Erreur de chargement");
        }
        const m = (await mRes.json()) as Mutuelle[];
        const r = (await rRes.json()) as Rubrique[];
        const f = (await fRes.json()) as Format[];
        const logoPayload = (await logoRes.json()) as SiteLogoPayload;
        setMutuelles(m);
        setRubriques(r);
        setFormats(f);
        setLogo(logoPayload);
      } catch (e) {
        console.error(e);
        setError("Impossible de charger les référentiels.");
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  const refreshMutuelles = async () => {
    const res = await fetch("/api/admin/mutuelles");
    if (!res.ok) return;
    const m = (await res.json()) as Mutuelle[];
    setMutuelles(m);
  };
  const refreshRubriques = async () => {
    const res = await fetch("/api/admin/rubriques");
    if (!res.ok) return;
    const r = (await res.json()) as Rubrique[];
    setRubriques(r);
  };
  const refreshFormats = async () => {
    const res = await fetch("/api/admin/formats");
    if (!res.ok) return;
    const f = (await res.json()) as Format[];
    setFormats(f);
  };
  const refreshLogo = async () => {
    const res = await fetch("/api/admin/logo", { cache: "no-store" });
    if (!res.ok) return;
    const payload = (await res.json()) as SiteLogoPayload;
    setLogo(payload);
  };

  const handleError = (e: unknown, fallback: string) => {
    const msg = e instanceof Error ? e.message : fallback;
    setError(msg);
  };

  const createMutuelle = async () => {
    if (!newMutuelleNom.trim()) return;
    setSavingKey("mutuelle-new");
    setError(null);
    try {
      const res = await fetch("/api/admin/mutuelles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nom: newMutuelleNom.trim() }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Erreur création mutuelle");
      }
      setNewMutuelleNom("");
      await refreshMutuelles();
    } catch (e) {
      handleError(e, "Erreur création mutuelle");
    } finally {
      setSavingKey(null);
    }
  };

  const updateMutuelle = async (m: Mutuelle, nom: string) => {
    if (!nom.trim() || nom === m.nom) return;
    setSavingKey(`mutuelle-${m.id}`);
    setError(null);
    try {
      const res = await fetch(`/api/admin/mutuelles/${m.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nom }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Erreur mise à jour mutuelle");
      }
      await refreshMutuelles();
    } catch (e) {
      handleError(e, "Erreur mise à jour mutuelle");
    } finally {
      setSavingKey(null);
    }
  };

  const deleteMutuelle = async (m: Mutuelle) => {
    if (!window.confirm(`Supprimer la mutuelle ${m.nom} ?`)) return;
    setSavingKey(`mutuelle-${m.id}`);
    setError(null);
    try {
      const res = await fetch(`/api/admin/mutuelles/${m.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Erreur suppression mutuelle");
      }
      await refreshMutuelles();
    } catch (e) {
      handleError(e, "Erreur suppression mutuelle");
    } finally {
      setSavingKey(null);
    }
  };

  const createRubrique = async () => {
    if (!newRubriqueLibelle.trim()) return;
    setSavingKey("rubrique-new");
    setError(null);
    try {
      const res = await fetch("/api/admin/rubriques", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ libelle: newRubriqueLibelle.trim() }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Erreur création rubrique");
      }
      setNewRubriqueLibelle("");
      await refreshRubriques();
    } catch (e) {
      handleError(e, "Erreur création rubrique");
    } finally {
      setSavingKey(null);
    }
  };

  const updateRubrique = async (r: Rubrique, libelle: string) => {
    if (!libelle.trim() || libelle === r.libelle) return;
    setSavingKey(`rubrique-${r.id}`);
    setError(null);
    try {
      const res = await fetch(`/api/admin/rubriques/${r.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ libelle }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Erreur mise à jour rubrique");
      }
      await refreshRubriques();
    } catch (e) {
      handleError(e, "Erreur mise à jour rubrique");
    } finally {
      setSavingKey(null);
    }
  };

  const deleteRubrique = async (r: Rubrique) => {
    if (!window.confirm(`Supprimer la rubrique ${r.libelle} ?`)) return;
    setSavingKey(`rubrique-${r.id}`);
    setError(null);
    try {
      const res = await fetch(`/api/admin/rubriques/${r.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Erreur suppression rubrique");
      }
      await refreshRubriques();
    } catch (e) {
      handleError(e, "Erreur suppression rubrique");
    } finally {
      setSavingKey(null);
    }
  };

  const createFormat = async () => {
    if (!newFormatLibelle.trim()) return;
    setSavingKey("format-new");
    setError(null);
    try {
      const signes =
        newFormatSignes.trim() === ""
          ? null
          : Number.parseInt(newFormatSignes.trim(), 10) || null;
      const res = await fetch("/api/admin/formats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          libelle: newFormatLibelle.trim(),
          signesReference: signes,
          hasChapo: newFormatHasChapo,
        }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Erreur création format");
      }
      setNewFormatLibelle("");
      setNewFormatSignes("");
      setNewFormatHasChapo(true);
      await refreshFormats();
    } catch (e) {
      handleError(e, "Erreur création format");
    } finally {
      setSavingKey(null);
    }
  };

  const updateFormat = async (
    f: Format,
    patch: Partial<{ libelle: string; signesReference: number | null; hasChapo: boolean }>
  ) => {
    setSavingKey(`format-${f.id}`);
    setError(null);
    try {
      const res = await fetch(`/api/admin/formats/${f.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Erreur mise à jour format");
      }
      await refreshFormats();
    } catch (e) {
      handleError(e, "Erreur mise à jour format");
    } finally {
      setSavingKey(null);
    }
  };

  const deleteFormat = async (f: Format) => {
    if (!window.confirm(`Supprimer le format ${f.libelle} ?`)) return;
    setSavingKey(`format-${f.id}`);
    setError(null);
    try {
      const res = await fetch(`/api/admin/formats/${f.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Erreur suppression format");
      }
      await refreshFormats();
    } catch (e) {
      handleError(e, "Erreur suppression format");
    } finally {
      setSavingKey(null);
    }
  };

  const uploadLogo = async () => {
    if (!logoFile) {
      setError("Sélectionnez un fichier image avant l’upload.");
      return;
    }

    setSavingKey("logo-upload");
    setError(null);
    setLogoMessage(null);

    try {
      const formData = new FormData();
      formData.append("file", logoFile);

      const res = await fetch("/api/admin/logo", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Erreur lors de l’upload du logo");
      }

      const payload = (await res.json()) as SiteLogoPayload;
      setLogo(payload);
      window.dispatchEvent(
        new CustomEvent("site-logo-updated", {
          detail: { logoUrl: payload.logoUrl },
        })
      );
      setLogoFile(null);
      setLogoInputKey((value) => value + 1);
      setLogoMessage("Logo mis à jour. Le header utilisera automatiquement ce nouveau fichier.");
      await refreshLogo();
    } catch (e) {
      handleError(e, "Erreur lors de l’upload du logo");
    } finally {
      setSavingKey(null);
    }
  };

  if (loading) {
    return (
      <section className="space-y-3 rounded-xl bg-white p-5 shadow-sm ring-1 ring-rer-border">
        <h1 className="text-lg font-semibold text-rer-text">
          Référentiels éditoriaux
        </h1>
        <p className="text-sm text-rer-muted">Chargement…</p>
      </section>
    );
  }

  return (
    <section className="min-w-0 space-y-4 rounded-xl bg-white p-5 shadow-sm ring-1 ring-rer-border">
      <header className="space-y-1">
        <h1 className="text-lg font-semibold text-rer-text">
          Référentiels éditoriaux
        </h1>
        <p className="text-sm text-rer-muted">
          Gérer les mutuelles, rubriques, formats et le logo affiché dans le
          header de l’application.
        </p>
      </header>

      {error && (
        <p className="text-sm text-red-600">
          {error}
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-3 rounded-lg bg-rer-app p-3 lg:col-span-2">
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-rer-muted">
              Logo du header
            </h2>
            <p className="mt-1 text-sm text-rer-muted">
              Tout logo uploadé ici remplace automatiquement celui affiché en
              haut de l’application.
            </p>
          </div>

          <div className="flex flex-col gap-4 rounded-lg border border-rer-border bg-white p-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <div className="relative h-20 w-20 overflow-hidden rounded-full border border-rer-border bg-white">
                <Image
                  src={logo.logoUrl}
                  alt="Logo actuel"
                  fill
                  sizes="80px"
                  className="object-contain p-3"
                  unoptimized
                />
              </div>
              <div className="space-y-1 text-sm">
                <p className="font-medium text-rer-text">
                  {logo.hasCustomLogo ? "Logo personnalisé actif" : "Logo historique actif"}
                </p>
                <p className="text-rer-muted break-all">{logo.logoUrl}</p>
              </div>
            </div>

            <div className="flex w-full min-w-0 flex-col gap-2 md:w-[320px] md:max-w-[320px]">
              <input
                key={logoInputKey}
                type="file"
                accept="image/*"
                onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)}
                className="block w-full text-sm text-rer-text file:mr-3 file:rounded-full file:border-0 file:bg-rer-blue file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white hover:file:bg-[#1e3380]"
              />
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="truncate text-xs text-rer-muted">
                  {logoFile ? logoFile.name : "PNG, JPG, WEBP…"}
                </p>
                <button
                  type="button"
                  onClick={uploadLogo}
                  disabled={savingKey === "logo-upload"}
                  className="inline-flex items-center rounded-full bg-rer-blue px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#1e3380] disabled:opacity-60"
                >
                  {savingKey === "logo-upload" ? "Upload…" : "Mettre à jour"}
                </button>
              </div>
              {logoMessage && <p className="text-xs text-green-700">{logoMessage}</p>}
            </div>
          </div>
        </div>

        {/* Mutuelles */}
        <div className="space-y-2 rounded-lg bg-rer-app p-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-rer-muted">
            Mutuelles
          </h2>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <input
              type="text"
              placeholder="Nom de la mutuelle"
              value={newMutuelleNom}
              onChange={(e) => setNewMutuelleNom(e.target.value)}
              className="h-8 flex-1 min-w-[160px] rounded border border-rer-border bg-white px-2 text-sm"
            />
            <button
              type="button"
              onClick={createMutuelle}
              disabled={savingKey === "mutuelle-new"}
              className="inline-flex items-center rounded-full bg-rer-blue px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#1e3380] disabled:opacity-60"
            >
              Ajouter
            </button>
          </div>
          <div className="max-h-72 space-y-1 overflow-y-auto rounded border border-rer-border bg-white p-1 text-sm">
            {mutuelles.map((m) => (
              <div
                key={m.id}
                className="flex flex-wrap items-center gap-2 rounded px-1 py-0.5 hover:bg-rer-app/60"
              >
                <input
                  type="text"
                  defaultValue={m.nom}
                  onBlur={(e) => updateMutuelle(m, e.target.value)}
                  className="min-w-0 flex-1 rounded border border-transparent px-1 py-0.5 text-sm hover:border-rer-border focus:border-rer-blue focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => deleteMutuelle(m)}
                  disabled={savingKey === `mutuelle-${m.id}`}
                  className="text-[11px] font-medium text-red-600 hover:text-red-700 disabled:opacity-60"
                >
                  Suppr.
                </button>
              </div>
            ))}
            {mutuelles.length === 0 && (
              <p className="px-1 py-0.5 text-xs text-rer-muted">
                Aucune mutuelle pour le moment.
              </p>
            )}
          </div>
        </div>

        {/* Rubriques */}
        <div className="space-y-2 rounded-lg bg-rer-app p-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-rer-muted">
            Rubriques
          </h2>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <input
              type="text"
              placeholder="Libellé de la rubrique"
              value={newRubriqueLibelle}
              onChange={(e) => setNewRubriqueLibelle(e.target.value)}
              className="h-8 flex-1 min-w-[160px] rounded border border-rer-border bg-white px-2 text-sm"
            />
            <button
              type="button"
              onClick={createRubrique}
              disabled={savingKey === "rubrique-new"}
              className="inline-flex items-center rounded-full bg-rer-blue px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#1e3380] disabled:opacity-60"
            >
              Ajouter
            </button>
          </div>
          <div className="max-h-72 space-y-1 overflow-y-auto rounded border border-rer-border bg-white p-1 text-sm">
            {rubriques.map((r) => (
              <div
                key={r.id}
                className="flex flex-wrap items-center gap-2 rounded px-1 py-0.5 hover:bg-rer-app/60"
              >
                <input
                  type="text"
                  defaultValue={r.libelle}
                  onBlur={(e) => updateRubrique(r, e.target.value)}
                  className="min-w-0 flex-1 rounded border border-transparent px-1 py-0.5 text-sm hover:border-rer-border focus:border-rer-blue focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => deleteRubrique(r)}
                  disabled={savingKey === `rubrique-${r.id}`}
                  className="text-[11px] font-medium text-red-600 hover:text-red-700 disabled:opacity-60"
                >
                  Suppr.
                </button>
              </div>
            ))}
            {rubriques.length === 0 && (
              <p className="px-1 py-0.5 text-xs text-rer-muted">
                Aucune rubrique pour le moment.
              </p>
            )}
          </div>
        </div>

        {/* Formats */}
        <div className="space-y-2 rounded-lg bg-rer-app p-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-rer-muted">
            Formats
          </h2>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <input
              type="text"
              placeholder="Libellé du format"
              value={newFormatLibelle}
              onChange={(e) => setNewFormatLibelle(e.target.value)}
              className="h-8 flex-1 min-w-[160px] rounded border border-rer-border bg-white px-2 text-sm"
            />
            <input
              type="number"
              min={0}
              placeholder="Signes de réf."
              value={newFormatSignes}
              onChange={(e) => setNewFormatSignes(e.target.value)}
              className="h-8 w-28 rounded border border-rer-border bg-white px-2 text-xs"
            />
            <button
              type="button"
              onClick={createFormat}
              disabled={savingKey === "format-new"}
              className="inline-flex items-center rounded-full bg-rer-blue px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#1e3380] disabled:opacity-60"
            >
              Ajouter
            </button>
            <label className="inline-flex items-center gap-1.5 text-xs text-rer-text">
              <input
                type="checkbox"
                checked={newFormatHasChapo}
                onChange={(e) => setNewFormatHasChapo(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-rer-border text-rer-blue focus:ring-rer-blue"
              />
              Chapô
            </label>
          </div>
          <div className="max-h-72 space-y-1 overflow-y-auto rounded border border-rer-border bg-white p-1 text-sm">
            {formats.map((f) => (
              <div
                key={f.id}
                className="flex flex-wrap items-center gap-2 rounded px-1 py-0.5 hover:bg-rer-app/60"
              >
                <input
                  type="text"
                  defaultValue={f.libelle}
                  onBlur={(e) =>
                    e.target.value !== f.libelle &&
                    updateFormat(f, { libelle: e.target.value })
                  }
                  className="min-w-0 flex-1 rounded border border-transparent px-1 py-0.5 text-sm hover:border-rer-border focus:border-rer-blue focus:outline-none"
                />
                <input
                  type="number"
                  defaultValue={f.signesReference ?? ""}
                  min={0}
                  onBlur={(e) => {
                    const v = e.target.value.trim();
                    const num =
                      v === "" ? null : Number.parseInt(v, 10) || null;
                    if (num !== f.signesReference) {
                      updateFormat(f, { signesReference: num });
                    }
                  }}
                  className="w-24 rounded border border-rer-border bg-white px-1 py-0.5 text-xs"
                />
                <label className="inline-flex items-center gap-1 text-[11px] text-rer-text">
                  <input
                    type="checkbox"
                    checked={f.hasChapo}
                    onChange={(e) => updateFormat(f, { hasChapo: e.target.checked })}
                    className="h-3.5 w-3.5 rounded border-rer-border text-rer-blue focus:ring-rer-blue"
                  />
                  Chapô
                </label>
                <button
                  type="button"
                  onClick={() => deleteFormat(f)}
                  disabled={savingKey === `format-${f.id}`}
                  className="text-[11px] font-medium text-red-600 hover:text-red-700 disabled:opacity-60"
                >
                  Suppr.
                </button>
              </div>
            ))}
            {formats.length === 0 && (
              <p className="px-1 py-0.5 text-xs text-rer-muted">
                Aucun format pour le moment.
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

