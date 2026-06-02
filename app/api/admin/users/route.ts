import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isValidRole } from "@/lib/auth";
import { isAuthFailure, requireRole } from "@/lib/api-auth";

const ADMIN_ONLY = { forbiddenMessage: "Accès réservé aux administrateurs" };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const userSafeSelect = {
  id: true,
  email: true,
  role: true,
  auteurId: true,
  createdAt: true,
  updatedAt: true,
};

export async function GET(request: NextRequest) {
  const sessionUser = await requireRole(request, "admin", ADMIN_ONLY);
  if (isAuthFailure(sessionUser)) return sessionUser;

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
  const sessionUser = await requireRole(request, "admin", ADMIN_ONLY);
  if (isAuthFailure(sessionUser)) return sessionUser;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });
  }
  const { email, role, auteurId, prenom, nom, mutuelleId } = (body ?? {}) as {
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
  const normalizedEmail = email.trim().toLowerCase();
  if (!EMAIL_RE.test(normalizedEmail)) {
    return NextResponse.json({ error: "Format d'email invalide" }, { status: 400 });
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

  const existingUser = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: { id: true },
  });
  if (existingUser) {
    return NextResponse.json(
      { error: "Un utilisateur existe déjà avec cet email." },
      { status: 409 }
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
          email: normalizedEmail,
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
      email: normalizedEmail,
      role: role && typeof role === "string" ? role : "auteur",
      auteurId: finalAuteurId,
    },
    select: userSafeSelect,
  });

  return NextResponse.json(user, { status: 201 });
}

