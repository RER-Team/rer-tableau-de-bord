import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAuthFailure, requireCanEditArticles, requireRole } from "@/lib/api-auth";

const ADMIN_ONLY = { forbiddenMessage: "Accès réservé aux administrateurs" };

export async function GET(request: NextRequest) {
  const sessionUser = await requireCanEditArticles(request);
  if (isAuthFailure(sessionUser)) return sessionUser;

  const auteurs = await prisma.auteur.findMany({
    orderBy: [{ nom: "asc" }, { prenom: "asc" }],
    include: { mutuelle: true },
  });
  const mutuelles = await prisma.mutuelle.findMany({
    orderBy: { nom: "asc" },
  });
  return NextResponse.json({ auteurs, mutuelles });
}

export async function POST(request: NextRequest) {
  const sessionUser = await requireRole(request, "admin", ADMIN_ONLY);
  if (isAuthFailure(sessionUser)) return sessionUser;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });
  }
  const { prenom, nom, email, mutuelleId } = (body ?? {}) as {
    prenom?: string;
    nom?: string;
    email?: string | null;
    mutuelleId?: string | null;
  };

  if (!prenom || !nom || !mutuelleId) {
    return NextResponse.json(
      { error: "Prénom, nom et mutuelle sont obligatoires" },
      { status: 400 }
    );
  }

  const auteur = await prisma.auteur.create({
    data: {
      prenom: prenom.trim(),
      nom: nom.trim(),
      email: email?.trim() || null,
      mutuelleId,
    },
  });

  return NextResponse.json(auteur, { status: 201 });
}

