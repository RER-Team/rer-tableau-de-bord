import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAuthFailure, requireRole } from "@/lib/api-auth";

const ADMIN_ONLY = { forbiddenMessage: "Accès réservé aux administrateurs" };

export async function GET(request: NextRequest) {
  const sessionUser = await requireRole(request, "admin", ADMIN_ONLY);
  if (isAuthFailure(sessionUser)) return sessionUser;

  const rubriques = await prisma.rubrique.findMany({
    orderBy: { libelle: "asc" },
  });
  return NextResponse.json(rubriques);
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
  const { libelle } = (body ?? {}) as { libelle?: string };
  if (!libelle || typeof libelle !== "string") {
    return NextResponse.json({ error: "Libellé obligatoire" }, { status: 400 });
  }

  const rubrique = await prisma.rubrique.create({
    data: { libelle: libelle.trim() },
  });
  return NextResponse.json(rubrique, { status: 201 });
}

