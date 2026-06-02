import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAuthFailure, requireRole } from "@/lib/api-auth";

const ADMIN_ONLY = { forbiddenMessage: "Accès réservé aux administrateurs" };

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const sessionUser = await requireRole(request, "admin", ADMIN_ONLY);
  if (isAuthFailure(sessionUser)) return sessionUser;

  const { id } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });
  }
  const { prenom, nom, email, mutuelleId, telephone } = (body ?? {}) as {
    prenom?: string;
    nom?: string;
    email?: string | null;
    mutuelleId?: string | null;
    telephone?: string | null;
  };

  const data: Record<string, unknown> = {};
  if (typeof prenom === "string") data.prenom = prenom.trim();
  if (typeof nom === "string") data.nom = nom.trim();
  if (email !== undefined) data.email = email?.trim() || null;
  if (telephone !== undefined) data.telephone = telephone?.trim() || null;
  if (mutuelleId !== undefined) data.mutuelleId = mutuelleId || null;

  const auteur = await prisma.auteur.update({
    where: { id },
    data,
  });
  return NextResponse.json(auteur);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const sessionUser = await requireRole(request, "admin", ADMIN_ONLY);
  if (isAuthFailure(sessionUser)) return sessionUser;

  const { id } = await params;
  await prisma.auteur.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

