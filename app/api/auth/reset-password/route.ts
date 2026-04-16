import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { prisma } from "@/lib/prisma";
import { hashPasswordResetToken } from "@/lib/password-reset";
import { getPasswordPolicyMessage, isPasswordValid } from "@/lib/password-policy";
export const runtime = "nodejs";

function logResetPasswordEvent(event: string, details: Record<string, unknown>) {
  console.info("[auth.reset-password]", JSON.stringify({ event, ...details }));
}

export async function POST(request: NextRequest) {
  let body: { token?: string; password?: string };
  try {
    body = (await request.json()) as { token?: string; password?: string };
  } catch {
    logResetPasswordEvent("invalid-json", {});
    return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });
  }

  const token = typeof body.token === "string" ? body.token.trim() : "";
  const password =
    typeof body.password === "string" ? body.password : "";

  if (!token) {
    logResetPasswordEvent("missing-token", {});
    return NextResponse.json({ error: "Token manquant" }, { status: 400 });
  }
  if (!password || !isPasswordValid(password)) {
    logResetPasswordEvent("invalid-password", { tokenPreview: token.slice(0, 8) });
    return NextResponse.json(
      { error: getPasswordPolicyMessage() },
      { status: 400 }
    );
  }

  const tokenHash = hashPasswordResetToken(token);
  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    select: {
      id: true,
      userId: true,
      usedAt: true,
      expiresAt: true,
    },
  });

  if (!resetToken || resetToken.usedAt || resetToken.expiresAt <= new Date()) {
    logResetPasswordEvent("invalid-or-expired-link", {
      tokenPreview: token.slice(0, 8),
    });
    return NextResponse.json({ error: "Lien invalide ou expiré" }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const now = new Date();

  const consumed = await prisma.passwordResetToken.updateMany({
    where: {
      id: resetToken.id,
      usedAt: null,
      expiresAt: { gt: now },
    },
    data: { usedAt: now },
  });

  if (consumed.count !== 1) {
    logResetPasswordEvent("token-race-lost", {
      resetTokenId: resetToken.id,
      userId: resetToken.userId,
    });
    return NextResponse.json({ error: "Lien invalide ou expiré" }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: resetToken.userId },
    data: { passwordHash },
  });

  await prisma.passwordResetToken.deleteMany({
    where: { userId: resetToken.userId },
  });

  logResetPasswordEvent("password-updated", { userId: resetToken.userId });

  const response = NextResponse.json({ ok: true }, { status: 200 });
  // Invalide la session du navigateur courant pour forcer une reconnexion.
  response.cookies.set("next-auth.session-token", "", {
    path: "/",
    maxAge: 0,
    httpOnly: true,
    sameSite: "lax",
  });
  response.cookies.set("__Secure-next-auth.session-token", "", {
    path: "/",
    maxAge: 0,
    httpOnly: true,
    sameSite: "lax",
    secure: true,
  });
  return response;
}
