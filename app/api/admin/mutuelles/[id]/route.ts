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
  const { nom } = (body ?? {}) as { nom?: string };

  const mutuelle = await prisma.mutuelle.update({
    where: { id },
    data: nom && typeof nom === "string" ? { nom: nom.trim() } : {},
  });
  return NextResponse.json(mutuelle);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const sessionUser = await requireRole(request, "admin", ADMIN_ONLY);
  if (isAuthFailure(sessionUser)) return sessionUser;

  const { id } = await params;
  await prisma.mutuelle.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

