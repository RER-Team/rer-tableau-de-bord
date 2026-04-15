import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { getWebPushPublicKey } from "@/lib/notifications/web-push";

type PushSubscriptionPayload = {
  endpoint?: unknown;
  keys?: {
    p256dh?: unknown;
    auth?: unknown;
  };
};

export async function GET(request: NextRequest) {
  const sessionUser = await getSessionUser(request);
  if (!sessionUser) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const publicKey = getWebPushPublicKey();
  return NextResponse.json({ publicKey, enabled: Boolean(publicKey) });
}

export async function POST(request: NextRequest) {
  const sessionUser = await getSessionUser(request);
  if (!sessionUser) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const body = ((await request.json()) ?? {}) as PushSubscriptionPayload;
  const endpoint = typeof body.endpoint === "string" ? body.endpoint.trim() : "";
  const p256dh = typeof body.keys?.p256dh === "string" ? body.keys.p256dh.trim() : "";
  const auth = typeof body.keys?.auth === "string" ? body.keys.auth.trim() : "";
  if (!endpoint || !p256dh || !auth) {
    return NextResponse.json({ error: "Subscription invalide." }, { status: 400 });
  }

  await prisma.pushSubscription.upsert({
    where: { endpoint },
    create: {
      userId: sessionUser.id,
      endpoint,
      p256dh,
      auth,
      userAgent: request.headers.get("user-agent") ?? null,
    },
    update: {
      userId: sessionUser.id,
      p256dh,
      auth,
      userAgent: request.headers.get("user-agent") ?? null,
    },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const sessionUser = await getSessionUser(request);
  if (!sessionUser) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const body = ((await request.json()) ?? {}) as { endpoint?: unknown };
  const endpoint = typeof body.endpoint === "string" ? body.endpoint.trim() : "";
  if (!endpoint) {
    return NextResponse.json({ error: "Endpoint requis." }, { status: 400 });
  }

  await prisma.pushSubscription.deleteMany({
    where: {
      userId: sessionUser.id,
      endpoint,
    },
  });
  return NextResponse.json({ ok: true });
}
