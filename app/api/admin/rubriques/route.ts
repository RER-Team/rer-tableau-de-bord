import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const sessionUser = await getSessionUser(request);
  if (!sessionUser) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  if (sessionUser.role !== "admin") {
    return NextResponse.json({ error: "Accès réservé aux administrateurs" }, { status: 403 });
  }

  const rubriques = await prisma.rubrique.findMany({
    orderBy: { libelle: "asc" },
  });
  return NextResponse.json(rubriques);
}

export async function POST(request: NextRequest) {
  const sessionUser = await getSessionUser(request);
  if (!sessionUser || sessionUser.role !== "admin") {
    return NextResponse.json({ error: "Accès réservé aux administrateurs" }, { status: 403 });
  }

  const body = await request.json();
  const { libelle } = body as { libelle?: string };
  if (!libelle || typeof libelle !== "string") {
    return NextResponse.json({ error: "Libellé obligatoire" }, { status: 400 });
  }

  const rubrique = await prisma.rubrique.create({
    data: { libelle: libelle.trim() },
  });
  return NextResponse.json(rubrique, { status: 201 });
}

