import { NextRequest, NextResponse } from "next/server";
import { isAuthFailure, requireRole } from "@/lib/api-auth";
import { getMailRuntimeDiagnostics, sendMail } from "@/lib/mail";
import { getWebPushPublicKey } from "@/lib/notifications/web-push";

const ADMIN_ONLY = { forbiddenMessage: "Accès réservé aux administrateurs" };

export async function GET(request: NextRequest) {
  const sessionUser = await requireRole(request, "admin", ADMIN_ONLY);
  if (isAuthFailure(sessionUser)) return sessionUser;

  const mailDiagnostics = getMailRuntimeDiagnostics();
  const smtpConfigured = Boolean(
    mailDiagnostics.hasMailFrom &&
      mailDiagnostics.hasSmtpConfig &&
      mailDiagnostics.smtpHostConfigured
  );

  const webPushConfigured = Boolean(
    process.env.WEB_PUSH_PUBLIC_KEY?.trim() && process.env.WEB_PUSH_PRIVATE_KEY?.trim()
  );

  // On ne renvoie que des booléens de haut niveau : aucun détail de
  // configuration SMTP (hôte, ports, identifiants) n'est exposé au client.
  return NextResponse.json({
    ok: true,
    smtpConfigured,
    webPushConfigured,
    webPushPublicKeyAvailable: Boolean(getWebPushPublicKey()),
  });
}

export async function POST(request: NextRequest) {
  const sessionUser = await requireRole(request, "admin", ADMIN_ONLY);
  if (isAuthFailure(sessionUser)) return sessionUser;

  let body: { email?: unknown };
  try {
    body = ((await request.json()) ?? {}) as { email?: unknown };
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });
  }
  const targetEmail = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!targetEmail) {
    return NextResponse.json({ error: "email requis" }, { status: 400 });
  }

  try {
    await sendMail({
      to: targetEmail,
      subject: "Test notifications SMTP",
      text: "Email de test SMTP depuis /api/notifications/health",
      html: "<p>Email de test SMTP depuis <code>/api/notifications/health</code></p>",
      tags: ["health-check", "smtp-test"],
    });
    return NextResponse.json({ ok: true, smtpTest: "sent" });
  } catch (error) {
    // Détail loggé côté serveur uniquement, réponse générique côté client.
    console.error("POST /api/notifications/health sendMail", error);
    return NextResponse.json(
      { ok: false, smtpTest: "failed", error: "Échec de l'envoi de l'email de test." },
      { status: 500 }
    );
  }
}
