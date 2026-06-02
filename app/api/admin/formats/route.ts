import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAuthFailure, requireRole } from "@/lib/api-auth";

const ADMIN_ONLY = { forbiddenMessage: "Accès réservé aux administrateurs" };

export async function GET(request: NextRequest) {
  const sessionUser = await requireRole(request, "admin", ADMIN_ONLY);
  if (isAuthFailure(sessionUser)) return sessionUser;

  const formats = await prisma.format.findMany({
    orderBy: { libelle: "asc" },
  });
  return NextResponse.json(formats);
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
  const { libelle, signesReference, hasChapo } = (body ?? {}) as {
    libelle?: string;
    signesReference?: number | null;
    hasChapo?: boolean;
  };
  if (!libelle || typeof libelle !== "string") {
    return NextResponse.json({ error: "Libellé obligatoire" }, { status: 400 });
  }
  if (hasChapo !== undefined && typeof hasChapo !== "boolean") {
    return NextResponse.json({ error: "Le champ hasChapo doit être un booléen" }, { status: 400 });
  }

  const format = await prisma.format.create({
    data: {
      libelle: libelle.trim(),
      signesReference:
        typeof signesReference === "number" ? signesReference : null,
      hasChapo: hasChapo ?? true,
    },
  });
  return NextResponse.json(format, { status: 201 });
}

