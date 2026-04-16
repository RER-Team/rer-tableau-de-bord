"use client";

import { useEffect, useState } from "react";

type Mutuelle = {
  id: string;
  nom: string;
};

type ProfilePayload = {
  user: {
    id: string;
    email: string;
    role: string;
    auteurId: string | null;
    auteur: {
      id: string;
      prenom: string;
      nom: string;
      email: string | null;
      telephone: string | null;
      mutuelleId: string | null;
    } | null;
  };
  mutuelles: Mutuelle[];
};

export default function MonProfilPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [mutuelles, setMutuelles] = useState<Mutuelle[]>([]);

  const [prenom, setPrenom] = useState("");
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [mutuelleId, setMutuelleId] = useState("");
  const [telephone, setTelephone] = useState("");

  const hydrate = (payload: ProfilePayload) => {
    setMutuelles(payload.mutuelles);
    setEmail(payload.user.email || "");
    setPrenom(payload.user.auteur?.prenom || "");
    setNom(payload.user.auteur?.nom || "");
    setMutuelleId(payload.user.auteur?.mutuelleId || "");
    setTelephone(payload.user.auteur?.telephone || "");
  };

  useEffect(() => {
    const run = async () => {
      try {
        const res = await fetch("/api/me/profile");
        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          throw new Error(json.error || "Erreur de chargement");
        }
        const payload = (await res.json()) as ProfilePayload;
        hydrate(payload);
      } catch (e: any) {
        setError(e.message || "Impossible de charger le profil.");
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/me/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prenom,
          nom,
          email,
          mutuelleId: mutuelleId || null,
          telephone: telephone || null,
        }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Erreur lors de l'enregistrement");
      }
      const payload = (await res.json()) as ProfilePayload["user"];
      setEmail(payload.email || "");
      setPrenom(payload.auteur?.prenom || "");
      setNom(payload.auteur?.nom || "");
      setMutuelleId(payload.auteur?.mutuelleId || "");
      setTelephone(payload.auteur?.telephone || "");
      setSuccess("Profil enregistré.");
    } catch (e: any) {
      setError(e.message || "Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <section className="mx-auto mt-6 max-w-3xl space-y-3 rounded-xl bg-white p-5 shadow-sm ring-1 ring-rer-border">
        <h1 className="text-lg font-semibold text-rer-text">Mon profil</h1>
        <p className="text-sm text-rer-muted">Chargement…</p>
      </section>
    );
  }

  return (
    <section className="mx-auto mt-6 max-w-3xl space-y-4 rounded-xl bg-white p-5 shadow-sm ring-1 ring-rer-border">
      <header className="space-y-1">
        <h1 className="text-lg font-semibold text-rer-text">Mon profil</h1>
        <p className="text-sm text-rer-muted">
          Mets à jour tes informations personnelles. Elles sont reprises dans
          la page Utilisateurs & rôles.
        </p>
      </header>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {success && <p className="text-sm text-green-700">{success}</p>}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="space-y-1 text-sm">
          <span className="text-rer-muted">Prénom</span>
          <input
            value={prenom}
            onChange={(e) => setPrenom(e.target.value)}
            className="h-10 w-full rounded border border-rer-border bg-white px-3 text-sm"
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-rer-muted">Nom</span>
          <input
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            className="h-10 w-full rounded border border-rer-border bg-white px-3 text-sm"
          />
        </label>
        <label className="space-y-1 text-sm sm:col-span-2">
          <span className="text-rer-muted">Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-10 w-full rounded border border-rer-border bg-white px-3 text-sm"
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-rer-muted">Mutuelle</span>
          <select
            value={mutuelleId}
            onChange={(e) => setMutuelleId(e.target.value)}
            className="h-10 w-full rounded border border-rer-border bg-white px-3 text-sm"
          >
            <option value="">Sélectionner…</option>
            {mutuelles.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nom}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-rer-muted">Téléphone</span>
          <input
            type="tel"
            value={telephone}
            onChange={(e) => setTelephone(e.target.value)}
            className="h-10 w-full rounded border border-rer-border bg-white px-3 text-sm"
            placeholder="06..."
          />
        </label>
      </div>

      <div className="pt-1">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center justify-center rounded-full bg-rer-blue px-4 py-2 text-sm font-semibold text-white hover:bg-[#1e3380] disabled:opacity-60"
        >
          {saving ? "Enregistrement..." : "Enregistrer"}
        </button>
      </div>
    </section>
  );
}
