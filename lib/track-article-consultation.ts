"use client";

import type { ConsultationSource } from "@/lib/article-consultations";

const recentClientKeys = new Set<string>();

/** Garde-fou client : un POST par ouverture réelle (évite spam sur re-render). */
export function trackArticleConsultation(
  articleId: string,
  source: ConsultationSource
): void {
  if (!articleId) return;
  const key = `${articleId}:${source}`;
  if (recentClientKeys.has(key)) return;
  recentClientKeys.add(key);
  setTimeout(() => recentClientKeys.delete(key), 60_000);

  void fetch(`/api/articles/${articleId}/consultations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ source }),
  }).catch(() => {
    recentClientKeys.delete(key);
  });
}
