import { createHash, randomBytes } from "crypto";
import { sendMail } from "@/lib/mail";
import { buildPasswordResetTemplate } from "@/lib/mail/templates/password-reset";

const PASSWORD_RESET_TTL_MINUTES = 60;

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function generatePasswordResetToken(): string {
  return randomBytes(32).toString("hex");
}

export function hashPasswordResetToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function getPasswordResetExpirationDate(): Date {
  return new Date(Date.now() + PASSWORD_RESET_TTL_MINUTES * 60 * 1000);
}

export function buildPasswordResetUrl(baseUrl: string, token: string): string {
  const url = new URL("/reset-password", baseUrl);
  url.searchParams.set("token", token);
  return url.toString();
}

export async function sendPasswordResetEmail(options: {
  email: string;
  resetUrl: string;
}): Promise<void> {
  const emailDomain = options.email.split("@")[1] ?? "unknown";
  console.info(
    "[auth.password-reset-email]",
    JSON.stringify({ event: "send-attempt", emailDomain })
  );
  const template = buildPasswordResetTemplate({ resetUrl: options.resetUrl });
  await sendMail({
    to: options.email,
    subject: template.subject,
    text: template.text,
    html: template.html,
    tags: ["password-reset"],
    meta: { flow: "forgot-password" },
  });
  console.info(
    "[auth.password-reset-email]",
    JSON.stringify({ event: "sent", emailDomain })
  );

  // En dev, on garde la trace explicite du lien pour faciliter les tests manuels.
  if (process.env.NODE_ENV !== "production") {
    console.info(`[password-reset] ${options.email} -> ${options.resetUrl}`);
  }
}
