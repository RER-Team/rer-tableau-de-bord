"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

type Mutuelle = {
  id: string;
  nom: string;
};

type ProfilePayload = {
  user: {
    id: string;
    email: string;
    avatarUrl: string | null;
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
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [pendingAvatarDataUrl, setPendingAvatarDataUrl] = useState<string | null>(null);
  const [cropZoom, setCropZoom] = useState(1);
  const [cropX, setCropX] = useState(50);
  const [cropY, setCropY] = useState(50);

  const hydrate = (payload: ProfilePayload) => {
    setMutuelles(payload.mutuelles);
    setEmail(payload.user.email || "");
    setAvatarUrl(payload.user.avatarUrl || null);
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
          avatarUrl,
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
      setAvatarUrl(payload.avatarUrl || null);
      setSuccess("Profil enregistré.");
    } catch (e: any) {
      setError(e.message || "Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (file: File) => {
    setUploadingAvatar(true);
    setError(null);
    setSuccess(null);
    try {
      const { uploadArticleImage } = await import("@/lib/uploadArticleImage");
      const { publicUrl } = await uploadArticleImage({
        file,
        filename: file.name || "avatar.jpg",
      });
      setAvatarUrl(publicUrl);
      setSuccess("Photo de profil téléversée. N'oublie pas d'enregistrer.");
    } catch (e: any) {
      setError(e.message || "Impossible d'envoyer la photo de profil.");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleAvatarFileSelected = async (file: File) => {
    const reader = new FileReader();
    const dataUrl = await new Promise<string>((resolve, reject) => {
      reader.onload = () => {
        if (typeof reader.result === "string") resolve(reader.result);
        else reject(new Error("Lecture image impossible."));
      };
      reader.onerror = () => reject(reader.error ?? new Error("Lecture image impossible."));
      reader.readAsDataURL(file);
    });
    setPendingAvatarDataUrl(dataUrl);
    setCropZoom(1);
    setCropX(50);
    setCropY(50);
  };

  const handleCropAndUpload = async () => {
    if (!pendingAvatarDataUrl) return;
    try {
      const croppedFile = await buildCroppedAvatarFile(pendingAvatarDataUrl, cropZoom, cropX, cropY);
      await handleAvatarUpload(croppedFile);
      setPendingAvatarDataUrl(null);
    } catch (e: any) {
      setError(e.message || "Impossible de recadrer l'image.");
    }
  };

  const handleRemoveAvatar = () => {
    setAvatarUrl(null);
    setSuccess("Photo de profil supprimée. N'oublie pas d'enregistrer.");
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

      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-rer-border bg-rer-app/40 p-3">
        <div className="relative h-16 w-16 overflow-hidden rounded-full border border-rer-border bg-white">
          {avatarUrl ? (
            <Image src={avatarUrl} alt="Photo de profil" fill className="object-cover" unoptimized />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-rer-muted">
              {((prenom[0] || "") + (nom[0] || "") || "U").toUpperCase()}
            </div>
          )}
        </div>
        <label className="inline-flex cursor-pointer items-center rounded-full border border-rer-border bg-white px-3 py-1.5 text-xs font-medium text-rer-text hover:bg-rer-app">
          {uploadingAvatar ? "Téléversement..." : "Changer la photo"}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            disabled={uploadingAvatar}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleAvatarFileSelected(file);
              e.currentTarget.value = "";
            }}
          />
        </label>
        <button
          type="button"
          onClick={handleRemoveAvatar}
          disabled={!avatarUrl || uploadingAvatar}
          className="inline-flex items-center rounded-full border border-rer-border bg-white px-3 py-1.5 text-xs font-medium text-rer-text hover:bg-rer-app disabled:opacity-50"
        >
          Supprimer la photo
        </button>
      </div>

      {pendingAvatarDataUrl ? (
        <div className="space-y-3 rounded-lg border border-rer-border bg-white p-3">
          <p className="text-sm font-medium text-rer-text">Recadrer la photo de profil</p>
          <div className="relative h-64 w-full overflow-hidden rounded-lg border border-rer-border bg-rer-app">
            <img
              src={pendingAvatarDataUrl}
              alt="Aperçu recadrage"
              className="h-full w-full object-cover"
              style={{
                transform: `scale(${cropZoom})`,
                transformOrigin: `${cropX}% ${cropY}%`,
              }}
            />
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <label className="text-xs text-rer-muted">
              Zoom
              <input
                type="range"
                min={1}
                max={3}
                step={0.01}
                value={cropZoom}
                onChange={(e) => setCropZoom(Number(e.target.value))}
                className="mt-1 w-full"
              />
            </label>
            <label className="text-xs text-rer-muted">
              Horizontal
              <input
                type="range"
                min={0}
                max={100}
                value={cropX}
                onChange={(e) => setCropX(Number(e.target.value))}
                className="mt-1 w-full"
              />
            </label>
            <label className="text-xs text-rer-muted">
              Vertical
              <input
                type="range"
                min={0}
                max={100}
                value={cropY}
                onChange={(e) => setCropY(Number(e.target.value))}
                className="mt-1 w-full"
              />
            </label>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void handleCropAndUpload()}
              className="inline-flex items-center rounded-full bg-rer-blue px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#1e3380]"
            >
              Valider le recadrage
            </button>
            <button
              type="button"
              onClick={() => setPendingAvatarDataUrl(null)}
              className="inline-flex items-center rounded-full border border-rer-border bg-white px-3 py-1.5 text-xs font-medium text-rer-text hover:bg-rer-app"
            >
              Annuler
            </button>
          </div>
        </div>
      ) : null}

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

async function buildCroppedAvatarFile(
  dataUrl: string,
  zoom: number,
  xPercent: number,
  yPercent: number
): Promise<File> {
  const image = await loadImage(dataUrl);
  const canvas = document.createElement("canvas");
  const size = 512;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas indisponible.");

  const sourceSize = Math.min(image.width, image.height) / zoom;
  const maxX = image.width - sourceSize;
  const maxY = image.height - sourceSize;
  const sx = (xPercent / 100) * maxX;
  const sy = (yPercent / 100) * maxY;

  ctx.drawImage(image, sx, sy, sourceSize, sourceSize, 0, 0, size, size);

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((result) => resolve(result), "image/jpeg", 0.9)
  );
  if (!blob) throw new Error("Échec du recadrage.");
  return new File([blob], "avatar-crop.jpg", { type: "image/jpeg" });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new window.Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Image invalide."));
    image.src = src;
  });
}
