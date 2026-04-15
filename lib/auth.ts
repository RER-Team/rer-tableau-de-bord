import { getServerSession } from "next-auth";
import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";
import { authOptions } from "./auth-options";
import { prisma } from "./prisma";
import { computePasswordSessionVersion } from "./password-session";

export type Role = "admin" | "relecteur" | "auteur" | "lecteur";
export const VALID_ROLES: Role[] = ["admin", "relecteur", "auteur", "lecteur"];

export interface SessionUser {
  id: string;
  email: string | null;
  role: Role;
  auteurId?: string | null;
}

/**
 * Vérifie que l'utilisateur connecté a le rôle relecteur ou admin (édition / relecture).
 */
export function canEditArticles(role: string | undefined): boolean {
  return role === "admin" || role === "relecteur";
}

export function isValidRole(role: string): role is Role {
  return VALID_ROLES.includes(role as Role);
}

/**
 * Récupère l'utilisateur connecté côté serveur.
 * En API Route (NextRequest fournie), utilise le JWT pour une lecture fiable des cookies.
 */
export async function getSessionUser(req?: NextRequest): Promise<SessionUser | null> {
  if (req) {
    const token = await getToken({ req });
    if (!token?.sub) return null;
    const dbUser = await prisma.user.findUnique({
      where: { id: token.sub },
      select: { passwordHash: true },
    });
    if (!dbUser?.passwordHash) return null;
    const currentPasswordVersion = computePasswordSessionVersion(dbUser.passwordHash);
    if (!token.passwordVersion || token.passwordVersion !== currentPasswordVersion) {
      return null;
    }
    return {
      id: token.sub,
      email: (token.email as string) ?? null,
      role: (token.role as Role) ?? "auteur",
      auteurId: (token.auteurId as string | null) ?? null,
    };
  }
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  return {
    id: session.user.id,
    email: session.user.email ?? null,
    role: (session.user.role as Role) ?? "auteur",
    auteurId: session.user.auteurId,
  };
}
