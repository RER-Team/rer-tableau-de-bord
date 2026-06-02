import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAuthFailure, requireRole } from "@/lib/api-auth";

const ADMIN_ONLY = { forbiddenMessage: "Accès réservé aux administrateurs" };

export async function GET(request: NextRequest) {
  const sessionUser = await requireRole(request, "admin", ADMIN_ONLY);
  if (isAuthFailure(sessionUser)) return sessionUser;

  const mutuelles = await prisma.mutuelle.findMany({
    orderBy: { nom: "asc" },
  });
  return NextResponse.json(mutuelles);
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
  const { nom } = (body ?? {}) as { nom?: string };
  if (!nom || typeof nom !== "string") {
    return NextResponse.json({ error: "Nom obligatoire" }, { status: 400 });
  }

  const mutuelle = await prisma.mutuelle.create({
    data: { nom: nom.trim() },
  });
  return NextResponse.json(mutuelle, { status: 201 });
}

