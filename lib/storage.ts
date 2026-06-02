import { supabaseAdmin } from "./supabase-server";
import { STORAGE_BUCKET } from "./storage-bucket";

type GetUploadUrlParams = {
  key: string;
  contentType: string;
  maxSizeBytes?: number;
  size?: number;
};

export type UploadUrlResult = {
  path: string;
  token: string;
  key: string;
  publicUrl: string | null;
};

export { STORAGE_BUCKET };

export function getPublicUrl(key: string): string | null {
  if (!supabaseAdmin) return null;
  const { data } = supabaseAdmin.storage.from(STORAGE_BUCKET).getPublicUrl(key);
  return data?.publicUrl ?? null;
}

export async function getUploadUrl({
  key,
  contentType,
  maxSizeBytes,
  size,
}: GetUploadUrlParams): Promise<UploadUrlResult> {
  if (!supabaseAdmin) {
    throw new Error(
      "Supabase admin client non initialisé. Vérifiez SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY."
    );
  }

  if (!/^image\//.test(contentType)) {
    throw new Error("Seuls les fichiers image sont autorisés.");
  }

  if (maxSizeBytes != null && maxSizeBytes <= 0) {
    throw new Error("Taille maximale invalide.");
  }

  if (maxSizeBytes != null && size != null && size > maxSizeBytes) {
    throw new Error("Fichier trop volumineux.");
  }

  const { data, error } = await supabaseAdmin.storage
    .from(STORAGE_BUCKET)
    .createSignedUploadUrl(key, { upsert: true });

  if (error || !data) {
    throw new Error(error?.message || "Impossible de créer l’URL signée d’upload.");
  }

  const publicUrl = getPublicUrl(key);

  return {
    path: data.path,
    token: data.token,
    key,
    publicUrl,
  };
}

