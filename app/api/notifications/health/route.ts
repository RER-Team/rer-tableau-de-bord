import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getMailRuntimeDiagnostics, sendMail } from "@/lib/mail";
import { getWebPushPublicKey } from "@/lib/notifications/web-push";

export async function GET(request: NextRequest) {
  const sessionUser = await getSessionUser(request);
  if (!sessionUser || (sessionUser.role !== "admin" && sessionUser.role !== "relecteur")) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const mailDiagnostics = getMailRuntimeDiagnostics();
  const smtpConfigured = Boolean(
    mailDiagnostics.hasMailFrom &&
      mailDiagnostics.hasSmtpConfig &&
      mailDiagnostics.smtpHostConfigured
  );

  const webPushConfigured = Boolean(
    process.env.WEB_PUSH_PUBLIC_KEY?.trim() && process.env.WEB_PUSH_PRIVATE_KEY?.trim()
  );

  return NextResponse.json({
    ok: true,
    smtpConfigured,
    mailDiagnostics,
    webPushConfigured,
    webPushPublicKeyAvailable: Boolean(getWebPushPublicKey()),
  });
}

export async function POST(request: NextRequest) {
  const sessionUser = await getSessionUser(request);
  if (!sessionUser || sessionUser.role !== "admin") {
    return NextResponse.json({ error: "Accès réservé aux administrateurs" }, { status: 403 });
  }

  const body = ((await request.json()) ?? {}) as { email?: unknown };
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
    return NextResponse.json(
      {
        ok: false,
        smtpTest: "failed",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
