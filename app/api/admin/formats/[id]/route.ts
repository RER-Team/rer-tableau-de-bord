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
  const { libelle, signesReference, hasChapo } = (body ?? {}) as {
    libelle?: string;
    signesReference?: number | null;
    hasChapo?: boolean;
  };

  const data: Record<string, unknown> = {};
  if (typeof libelle === "string") {
    data.libelle = libelle.trim();
  }
  if (signesReference !== undefined) {
    data.signesReference =
      typeof signesReference === "number" ? signesReference : null;
  }
  if (hasChapo !== undefined) {
    if (typeof hasChapo !== "boolean") {
      return NextResponse.json(
        { error: "Le champ hasChapo doit être un booléen" },
        { status: 400 }
      );
    }
    data.hasChapo = hasChapo;
  }

  const format = await prisma.format.update({
    where: { id },
    data,
  });
  return NextResponse.json(format);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const sessionUser = await requireRole(request, "admin", ADMIN_ONLY);
  if (isAuthFailure(sessionUser)) return sessionUser;

  const { id } = await params;
  await prisma.format.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

