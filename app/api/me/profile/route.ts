import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isSafeAvatarUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    // https uniquement : on refuse http, javascript:, data:, etc.
    return parsed.protocol === "https:";
  } catch {
    return false;
  }
}

const profileUserSelect = {
  id: true,
  email: true,
  avatarUrl: true,
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

  let body: {
    email?: string;
    prenom?: string;
    nom?: string;
    mutuelleId?: string | null;
    telephone?: string | null;
    avatarUrl?: string | null;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  const prenom = body.prenom?.trim();
  const nom = body.nom?.trim();
  const telephone = body.telephone?.trim() || null;
  const avatarUrl = body.avatarUrl?.trim() || null;
  const mutuelleId = body.mutuelleId || null;

  if (!email) {
    return NextResponse.json({ error: "Email obligatoire" }, { status: 400 });
  }
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Format d'email invalide" }, { status: 400 });
  }
  if (!prenom || !nom) {
    return NextResponse.json({ error: "Prénom et nom obligatoires" }, { status: 400 });
  }
  if (avatarUrl && !isSafeAvatarUrl(avatarUrl)) {
    return NextResponse.json(
      { error: "L'avatar doit être une URL https valide." },
      { status: 400 }
    );
  }
  if (!mutuelleId) {
    return NextResponse.json({ error: "Mutuelle obligatoire" }, { status: 400 });
  }

  // Unicité de l'email : refuse si déjà pris par un autre compte.
  const emailOwner = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
  if (emailOwner && emailOwner.id !== sessionUser.id) {
    return NextResponse.json(
      { error: "Cet email est déjà utilisé par un autre utilisateur." },
      { status: 409 }
    );
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
      data: { email, avatarUrl },
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
