/**
 * Source unique du nom de bucket Supabase Storage.
 *
 * Importé côté serveur (lib/storage.ts, lib/siteBranding.ts) comme côté client
 * (lib/supabase-client.ts). Sur le client, seul `NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET`
 * est injecté dans le bundle ; `SUPABASE_STORAGE_BUCKET` y est `undefined`, le
 * fallback reste donc cohérent avec le client web.
 */
export const STORAGE_BUCKET =
  process.env.SUPABASE_STORAGE_BUCKET ||
  process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET ||
  "articles";
