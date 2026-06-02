import { getPublicUrl } from "./storage";
import { supabaseAdmin } from "./supabase-server";
import { STORAGE_BUCKET } from "./storage-bucket";

export const LEGACY_LOGO_PUBLIC_PATH = "/default-logo.svg";
const SITE_LOGO_KEY = "branding/admin-logo";

export type SiteLogoPayload = {
  logoUrl: string;
  hasCustomLogo: boolean;
  updatedAt: number | null;
};

export async function getSiteLogoPayload(): Promise<SiteLogoPayload> {
  if (!supabaseAdmin) {
    return getDefaultLogoPayload();
  }

  try {
    const { data, error } = await supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .list("branding", { search: "admin-logo", limit: 10 });

    if (error) {
      throw error;
    }

    const existingLogo = data?.find((entry) => entry.name === "admin-logo");
    if (!existingLogo) {
      return getDefaultLogoPayload();
    }

    const publicUrl = getPublicUrl(SITE_LOGO_KEY);
    if (!publicUrl) {
      return getDefaultLogoPayload();
    }

    const updatedAt = toTimestamp(existingLogo.updated_at) ?? toTimestamp(existingLogo.created_at);

    return {
      logoUrl: `${publicUrl}?v=${updatedAt ?? Date.now()}`,
      hasCustomLogo: true,
      updatedAt: updatedAt ?? null,
    };
  } catch {
    return getDefaultLogoPayload();
  }
}

export async function saveSiteLogo(input: Buffer, mimeType: string): Promise<SiteLogoPayload> {
  if (!supabaseAdmin) {
    throw new Error(
      "Supabase admin client non initialisé. Vérifiez SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY."
    );
  }

  if (!mimeType.startsWith("image/")) {
    throw new Error("Le logo doit être un fichier image.");
  }

  const { error } = await supabaseAdmin.storage.from(STORAGE_BUCKET).upload(SITE_LOGO_KEY, input, {
    contentType: normalizeMimeType(mimeType),
    upsert: true,
  });

  if (error) {
    throw error;
  }

  return getSiteLogoPayload();
}

function getDefaultLogoPayload(): SiteLogoPayload {
  return {
    logoUrl: LEGACY_LOGO_PUBLIC_PATH,
    hasCustomLogo: false,
    updatedAt: null,
  };
}

function toTimestamp(value: string | null | undefined): number | null {
  if (!value) return null;
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? null : timestamp;
}

function normalizeMimeType(mimeType: string): string {
  if (mimeType === "image/jpg") return "image/jpeg";
  return mimeType;
}
