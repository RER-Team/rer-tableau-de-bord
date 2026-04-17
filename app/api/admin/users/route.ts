import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser, isValidRole } from "@/lib/auth";

const userSafeSelect = {
  id: true,
  email: true,
  role: true,
  auteurId: true,
  createdAt: true,
  updatedAt: true,
};

export async function GET(request: NextRequest) {
  const sessionUser = await getSessionUser(request);
  if (!sessionUser) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  if (sessionUser.role !== "admin") {
    return NextResponse.json({ error: "Accès réservé aux administrateurs" }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    orderBy: { email: "asc" },
    take: 500,
    select: userSafeSelect,
  });
  const auteurs = await prisma.auteur.findMany({
    orderBy: [{ nom: "asc" }, { prenom: "asc" }],
    select: {
      id: true,
      prenom: true,
      nom: true,
      email: true,
      telephone: true,
      mutuelleId: true,
    },
  });
  const mutuelles = await prisma.mutuelle.findMany({
    orderBy: { nom: "asc" },
  });
  return NextResponse.json({ users, auteurs, mutuelles });
}

export async function POST(request: NextRequest) {
  const sessionUser = await getSessionUser(request);
  if (!sessionUser || sessionUser.role !== "admin") {
    return NextResponse.json({ error: "Accès réservé aux administrateurs" }, { status: 403 });
  }

  const body = await request.json();
  const { email, role, auteurId, prenom, nom, mutuelleId } = body as {
    email?: string;
    role?: string;
    auteurId?: string | null;
    prenom?: string;
    nom?: string;
    mutuelleId?: string | null;
  };

  if (!email || typeof email !== "string") {
    return NextResponse.json({ error: "Email obligatoire" }, { status: 400 });
  }
  if (role !== undefined && (!role || typeof role !== "string" || !isValidRole(role))) {
    return NextResponse.json({ error: "Rôle invalide" }, { status: 400 });
  }

  if (!mutuelleId) {
    return NextResponse.json(
      { error: "Mutuelle obligatoire pour créer un utilisateur" },
      { status: 400 }
    );
  }

  let finalAuteurId = auteurId || null;

  // Si aucun auteur explicite n'est passé mais que l'on a prénom/nom,
  // on crée (ou réutilise) automatiquement une fiche Auteur associée.
  if (!finalAuteurId && prenom && nom) {
    const trimmedPrenom = prenom.trim();
    const trimmedNom = nom.trim();
    let auteur = await prisma.auteur.findFirst({
      where: { prenom: trimmedPrenom, nom: trimmedNom },
    });
    if (!auteur) {
      auteur = await prisma.auteur.create({
        data: {
          prenom: trimmedPrenom,
          nom: trimmedNom,
          email: email.trim().toLowerCase(),
          telephone: null,
          mutuelleId,
        },
      });
    } else if (mutuelleId) {
      auteur = await prisma.auteur.update({
        where: { id: auteur.id },
        data: { mutuelleId },
      });
    }
    finalAuteurId = auteur.id;
  }

  const user = await prisma.user.create({
    data: {
      email: email.trim().toLowerCase(),
      role: role && typeof role === "string" ? role : "auteur",
      auteurId: finalAuteurId,
    },
    select: userSafeSelect,
  });

  return NextResponse.json(user, { status: 201 });
}

