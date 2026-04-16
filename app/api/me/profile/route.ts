import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

const profileUserSelect = {
  id: true,
  email: true,
  role: true,
  auteurId: true,
  auteur: {
    select: {
      id: true,
      prenom: true,
      nom: true,
      email: true,
      telephone: true,
      mutuelleId: true,
    },
  },
} as const;

export async function GET(request: NextRequest) {
  const sessionUser = await getSessionUser(request);
  if (!sessionUser) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: profileUserSelect,
  });
  if (!user) {
    return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
  }

  const mutuelles = await prisma.mutuelle.findMany({
    orderBy: { nom: "asc" },
    select: { id: true, nom: true },
  });

  return NextResponse.json({
    user,
    mutuelles,
  });
}

export async function PATCH(request: NextRequest) {
  const sessionUser = await getSessionUser(request);
  if (!sessionUser) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const body = (await request.json()) as {
    email?: string;
    prenom?: string;
    nom?: string;
    mutuelleId?: string | null;
    telephone?: string | null;
  };

  const email = body.email?.trim().toLowerCase();
  const prenom = body.prenom?.trim();
  const nom = body.nom?.trim();
  const telephone = body.telephone?.trim() || null;
  const mutuelleId = body.mutuelleId || null;

  if (!email) {
    return NextResponse.json({ error: "Email obligatoire" }, { status: 400 });
  }
  if (!prenom || !nom) {
    return NextResponse.json({ error: "Prénom et nom obligatoires" }, { status: 400 });
  }
  if (!mutuelleId) {
    return NextResponse.json({ error: "Mutuelle obligatoire" }, { status: 400 });
  }

  const existingMutuelle = await prisma.mutuelle.findUnique({
    where: { id: mutuelleId },
    select: { id: true },
  });
  if (!existingMutuelle) {
    return NextResponse.json({ error: "Mutuelle invalide" }, { status: 400 });
  }

  const currentUser = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: {
      id: true,
      auteurId: true,
    },
  });
  if (!currentUser) {
    return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
  }

  const updated = await prisma.$transaction(async (tx) => {
    const user = await tx.user.update({
      where: { id: currentUser.id },
      data: { email },
      select: { id: true, auteurId: true },
    });

    let auteurId = user.auteurId;
    if (!auteurId) {
      const createdAuteur = await tx.auteur.create({
        data: {
          prenom,
          nom,
          email,
          telephone,
          mutuelleId,
        },
      });
      auteurId = createdAuteur.id;
      await tx.user.update({
        where: { id: user.id },
        data: { auteurId },
      });
    } else {
      await tx.auteur.update({
        where: { id: auteurId },
        data: {
          prenom,
          nom,
          email,
          telephone,
          mutuelleId,
        },
      });
    }

    return tx.user.findUnique({
      where: { id: user.id },
      select: profileUserSelect,
    });
  });

  return NextResponse.json(updated);
}
