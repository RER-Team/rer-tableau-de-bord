import { isPublishedStatus } from "@/lib/article-status";

/** Article lisible sans authentification (vitrine /decouvrir). */
export function isPublicReadableArticle(
  etatSlug: string | null | undefined
): boolean {
  return isPublishedStatus(etatSlug);
}
