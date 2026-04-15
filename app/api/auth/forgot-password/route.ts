import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
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

const GENERIC_MESSAGE =
  "Si un compte existe pour cet email, un lien de réinitialisation a été envoyé.";
const ACCOUNT_NOT_FOUND_MESSAGE =
  "Aucun compte n'existe avec cette adresse email.";
const INVALID_EMAIL_MESSAGE = "Veuillez saisir une adresse email valide.";
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT_MAX_ATTEMPTS_PER_IP = 20;
const RATE_LIMIT_MAX_ATTEMPTS_PER_EMAIL = 5;

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const ipRateLimitStore = new Map<string, RateLimitEntry>();
const emailRateLimitStore = new Map<string, RateLimitEntry>();

function nowMs(): number {
  return Date.now();
}

function hashForLog(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 12);
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
  let body: { email?: string };
  try {
    body = (await request.json()) as { email?: string };
  } catch {
    logForgotPasswordEvent("invalid-json", { ipHash: hashForLog(ip) });
    return NextResponse.json({ message: GENERIC_MESSAGE }, { status: 200 });
  }

  const rawEmail = typeof body.email === "string" ? body.email : "";
  const email = normalizeEmail(rawEmail);

  if (!email || !isValidEmail(email)) {
    logForgotPasswordEvent("invalid-email", { ipHash: hashForLog(ip) });
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
      ipHash: hashForLog(ip),
      emailHash: hashForLog(email),
      reason: ipLimited ? "ip" : "email",
    });
    return NextResponse.json({ message: GENERIC_MESSAGE }, { status: 200 });
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, passwordHash: true },
  });

  if (!user?.passwordHash) {
    logForgotPasswordEvent("user-not-eligible", {
      ipHash: hashForLog(ip),
      emailHash: hashForLog(email),
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
      ipHash: hashForLog(ip),
      userId: user.id,
      emailHash: hashForLog(email),
    });
  } catch {
    // On garde une réponse générique pour ne pas divulguer l'existence de comptes.
    logForgotPasswordEvent("email-failed", {
      ipHash: hashForLog(ip),
      userId: user.id,
      emailHash: hashForLog(email),
    });
  }

  return NextResponse.json({ message: GENERIC_MESSAGE }, { status: 200 });
}
