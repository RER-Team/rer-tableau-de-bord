"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
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
  const [cropOffset, setCropOffset] = useState({ x: 0, y: 0 });
  const dragPointerIdRef = useRef<number | null>(null);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const dragOriginRef = useRef({ x: 0, y: 0 });

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
    setCropOffset({ x: 0, y: 0 });
  };

  const handleCropAndUpload = async () => {
    if (!pendingAvatarDataUrl) return;
    try {
      const croppedFile = await buildCroppedAvatarFile(
        pendingAvatarDataUrl,
        cropZoom,
        cropOffset
      );
      await handleAvatarUpload(croppedFile);
      setPendingAvatarDataUrl(null);
    } catch (e: any) {
      setError(e.message || "Impossible de recadrer l'image.");
    }
  };

  const handleCropPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    dragPointerIdRef.current = event.pointerId;
    dragStartRef.current = { x: event.clientX, y: event.clientY };
    dragOriginRef.current = { ...cropOffset };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleCropPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (dragPointerIdRef.current !== event.pointerId) return;
    const deltaX = event.clientX - dragStartRef.current.x;
    const deltaY = event.clientY - dragStartRef.current.y;
    const nextOffset = {
      x: dragOriginRef.current.x + deltaX,
      y: dragOriginRef.current.y + deltaY,
    };
    setCropOffset(clampCropOffset(nextOffset, cropZoom));
  };

  const handleCropPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (dragPointerIdRef.current !== event.pointerId) return;
    dragPointerIdRef.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const handleZoomChange = (nextZoom: number) => {
    setCropZoom(nextZoom);
    setCropOffset((previous) => clampCropOffset(previous, nextZoom));
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
          <p className="text-xs text-rer-muted">
            Positionne ton image dans le cadre comme sur LinkedIn, puis valide.
          </p>
          <div className="mx-auto w-full max-w-[320px]">
            <div className="relative aspect-square overflow-hidden rounded-2xl border border-rer-border bg-rer-app">
              <div
                className="h-full w-full touch-none select-none"
                onPointerDown={handleCropPointerDown}
                onPointerMove={handleCropPointerMove}
                onPointerUp={handleCropPointerUp}
                onPointerCancel={handleCropPointerUp}
              >
                <img
                  src={pendingAvatarDataUrl}
                  alt="Aperçu recadrage"
                  draggable={false}
                  className="h-full w-full object-cover"
                  style={{
                    transform: `translate3d(${cropOffset.x}px, ${cropOffset.y}px, 0) scale(${cropZoom})`,
                    transformOrigin: "center center",
                  }}
                />
              </div>
              <div className="pointer-events-none absolute inset-0 border border-white/60" />
              <div className="pointer-events-none absolute inset-4 rounded-full border-2 border-white/90 shadow-[0_0_0_9999px_rgba(15,23,42,0.25)]" />
            </div>
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
                onChange={(e) => handleZoomChange(Number(e.target.value))}
                className="mt-1 w-full"
              />
            </label>
            <div className="text-xs text-rer-muted sm:col-span-2">
              Glisse l’image dans le cadre pour ajuster le recadrage.
            </div>
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
  offset: { x: number; y: number }
): Promise<File> {
  const image = await loadImage(dataUrl);
  const canvas = document.createElement("canvas");
  const outputSize = 512;
  const viewportSize = 320;
  canvas.width = outputSize;
  canvas.height = outputSize;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas indisponible.");

  const baseScale = Math.max(viewportSize / image.width, viewportSize / image.height);
  const effectiveScale = baseScale * zoom;
  const displayedWidth = image.width * effectiveScale;
  const displayedHeight = image.height * effectiveScale;
  const clampedOffset = clampCropOffset(offset, zoom);
  const left = (viewportSize - displayedWidth) / 2 + clampedOffset.x;
  const top = (viewportSize - displayedHeight) / 2 + clampedOffset.y;
  const sx = clamp(-left / effectiveScale, 0, image.width);
  const sy = clamp(-top / effectiveScale, 0, image.height);
  const sWidth = clamp(viewportSize / effectiveScale, 1, image.width - sx);
  const sHeight = clamp(viewportSize / effectiveScale, 1, image.height - sy);

  ctx.drawImage(image, sx, sy, sWidth, sHeight, 0, 0, outputSize, outputSize);

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((result) => resolve(result), "image/jpeg", 0.9)
  );
  if (!blob) throw new Error("Échec du recadrage.");
  return new File([blob], "avatar-crop.jpg", { type: "image/jpeg" });
}

function clampCropOffset(offset: { x: number; y: number }, zoom: number): { x: number; y: number } {
  const viewportSize = 320;
  const side = viewportSize * zoom;
  const max = Math.max(0, (side - viewportSize) / 2);
  return {
    x: clamp(offset.x, -max, max),
    y: clamp(offset.y, -max, max),
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new window.Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Image invalide."));
    image.src = src;
  });
}
