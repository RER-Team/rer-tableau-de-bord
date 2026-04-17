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

  const formats = await prisma.format.findMany({
    orderBy: { libelle: "asc" },
  });
  return NextResponse.json(formats);
}

export async function POST(request: NextRequest) {
  const sessionUser = await getSessionUser(request);
  if (!sessionUser || sessionUser.role !== "admin") {
    return NextResponse.json({ error: "Accès réservé aux administrateurs" }, { status: 403 });
  }

  const body = await request.json();
  const { libelle, signesReference, hasChapo } = body as {
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

