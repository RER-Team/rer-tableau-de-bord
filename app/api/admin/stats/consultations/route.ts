import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const sessionUser = await getSessionUser(request);
  if (!sessionUser) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  if (sessionUser.role !== "admin") {
    return NextResponse.json(
      { error: "Accès réservé aux administrateurs" },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(request.url);
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");
  const limit = Math.min(
    50,
    Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10))
  );

  const createdAt: { gte?: Date; lte?: Date } = {};
  if (fromParam) {
    const from = new Date(fromParam);
    if (!Number.isNaN(from.getTime())) createdAt.gte = from;
  }
  if (toParam) {
    const to = new Date(toParam);
    if (!Number.isNaN(to.getTime())) createdAt.lte = to;
  }

  const where =
    Object.keys(createdAt).length > 0 ? { createdAt } : undefined;

  const [totalViews, uniqueReaders, topRaw] = await Promise.all([
    prisma.articleConsultation.count({ where }),
    prisma.articleConsultation.groupBy({
      by: ["userId"],
      where,
    }),
    prisma.articleConsultation.groupBy({
      by: ["articleId"],
      where,
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: limit,
    }),
  ]);

  const articleIds = topRaw.map((row) => row.articleId);
  const articles =
    articleIds.length > 0
      ? await prisma.article.findMany({
          where: { id: { in: articleIds } },
          select: {
            id: true,
            titre: true,
            auteur: { select: { prenom: true, nom: true } },
            mutuelle: { select: { nom: true } },
          },
        })
      : [];
  const articleById = new Map(articles.map((a) => [a.id, a]));

  const topArticles = await Promise.all(
    topRaw.map(async (row) => {
      const uniqueForArticle = await prisma.articleConsultation.groupBy({
        by: ["userId"],
        where: {
          articleId: row.articleId,
          ...(where ?? {}),
        },
      });
      const meta = articleById.get(row.articleId);
      return {
        articleId: row.articleId,
        titre: meta?.titre ?? "—",
        auteur: meta?.auteur
          ? `${meta.auteur.prenom} ${meta.auteur.nom}`
          : null,
        mutuelle: meta?.mutuelle?.nom ?? null,
        totalViews: row._count.id,
        uniqueReaders: uniqueForArticle.length,
      };
    })
  );

  return NextResponse.json({
    totalViews,
    uniqueReaders: uniqueReaders.length,
    topArticles,
  });
}
