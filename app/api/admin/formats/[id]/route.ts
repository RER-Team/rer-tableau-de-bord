import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const sessionUser = await getSessionUser(request);
  if (!sessionUser || sessionUser.role !== "admin") {
    return NextResponse.json({ error: "Accès réservé aux administrateurs" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const { libelle, signesReference, hasChapo } = body as {
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
  const sessionUser = await getSessionUser(request);
  if (!sessionUser || sessionUser.role !== "admin") {
    return NextResponse.json({ error: "Accès réservé aux administrateurs" }, { status: 403 });
  }

  const { id } = await params;
  await prisma.format.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

