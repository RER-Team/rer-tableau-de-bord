import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  buildPasswordResetUrl,
  generatePasswordResetToken,
  getPasswordResetExpirationDate,
  hashPasswordResetToken,
  isValidEmail,
  normalizeEmail,
  sendPasswordResetEmail,
} from "@/lib/password-reset";

const RESET_LINK_SENT_MESSAGE =
  "Un lien de réinitialisation a été envoyé à votre adresse email.";
const ACCOUNT_NOT_FOUND_MESSAGE =
  "Aucun compte n'existe avec cette adresse email.";
const INVALID_EMAIL_MESSAGE = "Veuillez saisir une adresse email valide.";
const RATE_LIMIT_MESSAGE =
  "Trop de demandes de réinitialisation. Merci de réessayer dans quelques minutes.";
const EMAIL_SEND_FAILED_MESSAGE =
  "L'envoi de l'email a échoué. Merci de réessayer plus tard.";
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT_MAX_ATTEMPTS_PER_IP = 20;
const RATE_LIMIT_MAX_ATTEMPTS_PER_EMAIL = 5;
export const runtime = "nodejs";

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const ipRateLimitStore = new Map<string, RateLimitEntry>();
const emailRateLimitStore = new Map<string, RateLimitEntry>();

function nowMs(): number {
  return Date.now();
}

function getClientIp(request: NextRequest): string {
  const xff = request.headers.get("x-forwarded-for") ?? "";
  return xff.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
}

function isRateLimited(
  store: Map<string, RateLimitEntry>,
  key: string,
  maxAttempts: number
): boolean {
  const now = nowMs();
  const current = store.get(key);
  if (!current || current.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  if (current.count >= maxAttempts) {
    return true;
  }
  current.count += 1;
  return false;
}

function logForgotPasswordEvent(event: string, details: Record<string, unknown>) {
  console.info("[auth.forgot-password]", JSON.stringify({ event, ...details }));
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  try {
    let body: { email?: string };
    try {
      body = (await request.json()) as { email?: string };
    } catch {
      logForgotPasswordEvent("invalid-json", { ip });
      return NextResponse.json({ error: INVALID_EMAIL_MESSAGE }, { status: 400 });
    }

    const rawEmail = typeof body.email === "string" ? body.email : "";
    const email = normalizeEmail(rawEmail);

    if (!email || !isValidEmail(email)) {
      logForgotPasswordEvent("invalid-email", { ip, email });
      return NextResponse.json({ error: INVALID_EMAIL_MESSAGE }, { status: 400 });
    }

    const ipLimited = isRateLimited(
      ipRateLimitStore,
      `ip:${ip}`,
      RATE_LIMIT_MAX_ATTEMPTS_PER_IP
    );
    const emailLimited = isRateLimited(
      emailRateLimitStore,
      `email:${email}`,
      RATE_LIMIT_MAX_ATTEMPTS_PER_EMAIL
    );
    if (ipLimited || emailLimited) {
      logForgotPasswordEvent("rate-limited", {
        ip,
        email,
        reason: ipLimited ? "ip" : "email",
      });
      return NextResponse.json({ error: RATE_LIMIT_MESSAGE }, { status: 429 });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true },
    });

    if (!user) {
      logForgotPasswordEvent("user-not-eligible", {
        ip,
        email,
      });
      return NextResponse.json({ error: ACCOUNT_NOT_FOUND_MESSAGE }, { status: 404 });
    }

    const token = generatePasswordResetToken();
    const tokenHash = hashPasswordResetToken(token);
    const expiresAt = getPasswordResetExpirationDate();

    await prisma.passwordResetToken.deleteMany({
      where: { userId: user.id },
    });

    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    const baseUrl =
      process.env.NEXTAUTH_URL?.trim() ||
      process.env.APP_BASE_URL?.trim() ||
      new URL(request.url).origin;
    const resetUrl = buildPasswordResetUrl(baseUrl, token);

    try {
      await sendPasswordResetEmail({ email: user.email, resetUrl });
      logForgotPasswordEvent("email-sent", {
        ip,
        userId: user.id,
        email,
      });
    } catch {
      logForgotPasswordEvent("email-failed", {
        ip,
        userId: user.id,
        email,
      });
      return NextResponse.json(
        { error: EMAIL_SEND_FAILED_MESSAGE },
        { status: 502 }
      );
    }

    return NextResponse.json({ message: RESET_LINK_SENT_MESSAGE }, { status: 200 });
  } catch (error) {
    logForgotPasswordEvent("unexpected-error", {
      ip,
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Erreur serveur lors de la demande de réinitialisation." },
      { status: 500 }
    );
  }
}
