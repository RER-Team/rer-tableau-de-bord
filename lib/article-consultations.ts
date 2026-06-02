import { prisma } from "@/lib/prisma";

export const CONSULTATION_DEDUP_WINDOW_MS = 30 * 60 * 1000;

export type ConsultationSource =
  | "explorer"
  | "side-panel"
  | "full-page"
  | "cards";

const VALID_SOURCES = new Set<ConsultationSource>([
  "explorer",
  "side-panel",
  "full-page",
  "cards",
]);

export function isValidConsultationSource(
  source: string
): source is ConsultationSource {
  return VALID_SOURCES.has(source as ConsultationSource);
}

/** Enregistre une consultation si hors fenêtre de dédup (30 min). */
export async function recordArticleConsultation(params: {
  articleId: string;
  userId: string;
  source: ConsultationSource;
}): Promise<{ recorded: boolean }> {
  const since = new Date(Date.now() - CONSULTATION_DEDUP_WINDOW_MS);

  const recent = await prisma.articleConsultation.findFirst({
    where: {
      articleId: params.articleId,
      userId: params.userId,
      createdAt: { gte: since },
    },
    select: { id: true },
  });

  if (recent) {
    return { recorded: false };
  }

  await prisma.articleConsultation.create({
    data: {
      articleId: params.articleId,
      userId: params.userId,
      source: params.source,
    },
  });

  return { recorded: true };
}
