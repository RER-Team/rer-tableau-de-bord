import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  canEditArticles,
  getSessionUser,
  type Role,
  type SessionUser,
} from "./auth";

/**
 * Helpers de garde pour les routes API.
 *
 * Chaque helper renvoie soit le `SessionUser` authentifié, soit une
 * `NextResponse` d'erreur (401 si pas de session, 403 si rôle insuffisant).
 * On distingue volontairement 401 et 403 pour ne pas confondre
 * « non authentifié » et « authentifié mais non autorisé ».
 */

export function unauthorized(message = "Non authentifié"): NextResponse {
  return NextResponse.json({ error: message }, { status: 401 });
}

export function forbidden(message = "Accès refusé"): NextResponse {
  return NextResponse.json({ error: message }, { status: 403 });
}

/** Garde une `value` issue d'un helper et indique s'il s'agit d'une erreur. */
export function isAuthFailure(
  value: SessionUser | NextResponse
): value is NextResponse {
  return value instanceof NextResponse;
}

/** Exige une session valide. */
export async function requireSession(
  req: NextRequest
): Promise<SessionUser | NextResponse> {
  const user = await getSessionUser(req);
  if (!user) {
    return unauthorized();
  }
  return user;
}

/** Exige une session valide ET l'un des rôles fournis. */
export async function requireRole(
  req: NextRequest,
  role: Role | Role[],
  options?: { forbiddenMessage?: string }
): Promise<SessionUser | NextResponse> {
  const user = await getSessionUser(req);
  if (!user) {
    return unauthorized();
  }
  const roles = Array.isArray(role) ? role : [role];
  if (!roles.includes(user.role)) {
    return forbidden(options?.forbiddenMessage);
  }
  return user;
}

/** Exige une session avec un rôle autorisé à éditer/relire les articles. */
export async function requireCanEditArticles(
  req: NextRequest
): Promise<SessionUser | NextResponse> {
  const user = await getSessionUser(req);
  if (!user) {
    return unauthorized();
  }
  if (!canEditArticles(user.role)) {
    return forbidden();
  }
  return user;
}
