import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ARTICLE_STATUS_OPTIONS } from "@/lib/article-status";
import { getSessionUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const sessionUser = await getSessionUser(request);
  if (!sessionUser) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  const isAdmin = sessionUser.role === "admin";

  const q = (request.nextUrl.searchParams.get("q") ?? "").trim().toLowerCase();
  const hasSearch = q.length >= 2;

  const [auteurs, mutuelles, rubriques, formats] = await Promise.all([
    // Les non-admins ne reçoivent que l'identité d'affichage des auteurs
    // (pas d'email ni de téléphone).
    prisma.auteur.findMany({
      orderBy: [{ nom: "asc" }, { prenom: "asc" }],
      select: isAdmin
        ? undefined
        : { id: true, prenom: true, nom: true },
    }),
    hasSearch
      ? prisma.mutuelle.findMany({
          where: { nom: { contains: q, mode: "insensitive" } },
          orderBy: { nom: "asc" },
          take: 10,
        })
      : prisma.mutuelle.findMany({ orderBy: { nom: "asc" } }),
    hasSearch
      ? prisma.rubrique.findMany({
          where: { libelle: { contains: q, mode: "insensitive" } },
          orderBy: { libelle: "asc" },
          take: 10,
        })
      : prisma.rubrique.findMany({ orderBy: { libelle: "asc" } }),
    hasSearch
      ? prisma.format.findMany({
          where: { libelle: { contains: q, mode: "insensitive" } },
          orderBy: { libelle: "asc" },
          take: 10,
        })
      : prisma.format.findMany({ orderBy: { libelle: "asc" } }),
  ]);

  // Données spécifiques à un utilisateur authentifié : pas de cache public.
  return NextResponse.json(
    { auteurs, mutuelles, rubriques, formats, etats: ARTICLE_STATUS_OPTIONS },
    {
      headers: {
        "Cache-Control": "private, no-store",
      },
    }
  );
}
