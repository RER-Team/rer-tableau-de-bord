import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isValidRole } from "@/lib/auth";
import { isAuthFailure, requireRole } from "@/lib/api-auth";

const ADMIN_ONLY = { forbiddenMessage: "Accès réservé aux administrateurs" };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const userSafeSelect = {
  id: true,
  email: true,
  role: true,
  auteurId: true,
  createdAt: true,
  updatedAt: true,
};

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
  const payload = (body ?? {}) as Record<string, unknown>;
  const data: Record<string, unknown> = {};

  const existing = await prisma.user.findUnique({
    where: { id },
    select: { id: true, role: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
  }

  if (typeof payload.email === "string") {
    const normalizedEmail = payload.email.trim().toLowerCase();
    if (!EMAIL_RE.test(normalizedEmail)) {
      return NextResponse.json({ error: "Format d'email invalide" }, { status: 400 });
    }
    const emailOwner = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true },
    });
    if (emailOwner && emailOwner.id !== id) {
      return NextResponse.json(
        { error: "Cet email est déjà utilisé par un autre utilisateur." },
        { status: 409 }
      );
    }
    data.email = normalizedEmail;
  }
  if (typeof payload.role === "string") {
    if (!isValidRole(payload.role)) {
      return NextResponse.json({ error: "Rôle invalide" }, { status: 400 });
    }
    // Empêche la rétrogradation du dernier administrateur.
    if (existing.role === "admin" && payload.role !== "admin") {
      const adminCount = await prisma.user.count({ where: { role: "admin" } });
      if (adminCount <= 1) {
        return NextResponse.json(
          { error: "Impossible de rétrograder le dernier administrateur." },
          { status: 409 }
        );
      }
    }
    data.role = payload.role;
  }
  if (payload.auteurId !== undefined) {
    data.auteurId = (payload.auteurId as string | null) || null;
  }

  const user = await prisma.user.update({
    where: { id },
    data,
    select: userSafeSelect,
  });

  return NextResponse.json(user);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const sessionUser = await requireRole(request, "admin", ADMIN_ONLY);
  if (isAuthFailure(sessionUser)) return sessionUser;

  const { id } = await params;

  const existing = await prisma.user.findUnique({
    where: { id },
    select: { id: true, role: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
  }

  // Empêche la suppression du dernier administrateur.
  if (existing.role === "admin") {
    const adminCount = await prisma.user.count({ where: { role: "admin" } });
    if (adminCount <= 1) {
      return NextResponse.json(
        { error: "Impossible de supprimer le dernier administrateur." },
        { status: 409 }
      );
    }
  }

  await prisma.user.delete({
    where: { id },
  });

  return NextResponse.json({ ok: true });
}
