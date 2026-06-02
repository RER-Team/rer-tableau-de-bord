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
  const { libelle } = (body ?? {}) as { libelle?: string };

  const rubrique = await prisma.rubrique.update({
    where: { id },
    data: libelle && typeof libelle === "string" ? { libelle: libelle.trim() } : {},
  });
  return NextResponse.json(rubrique);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const sessionUser = await requireRole(request, "admin", ADMIN_ONLY);
  if (isAuthFailure(sessionUser)) return sessionUser;

  const { id } = await params;
  await prisma.rubrique.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

