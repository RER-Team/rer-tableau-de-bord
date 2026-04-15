import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

const notificationSelect = {
  id: true,
  type: true,
  title: true,
  body: true,
  metadata: true,
  readAt: true,
  createdAt: true,
} as const;

export async function GET(request: NextRequest) {
  const sessionUser = await getSessionUser(request);
  if (!sessionUser) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit") ?? 20)));

  const [items, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: sessionUser.id },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: notificationSelect,
    }),
    prisma.notification.count({
      where: { userId: sessionUser.id, readAt: null },
    }),
  ]);

  return NextResponse.json({ items, unreadCount });
}

export async function PATCH(request: NextRequest) {
  const sessionUser = await getSessionUser(request);
  if (!sessionUser) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const body = ((await request.json()) ?? {}) as {
    ids?: unknown;
    markAllRead?: unknown;
  };

  if (body.markAllRead === true) {
    await prisma.notification.updateMany({
      where: { userId: sessionUser.id, readAt: null },
      data: { readAt: new Date() },
    });
    return NextResponse.json({ ok: true });
  }

  if (!Array.isArray(body.ids) || body.ids.length === 0) {
    return NextResponse.json(
      { error: "Veuillez préciser des notifications à marquer comme lues." },
      { status: 400 }
    );
  }

  const ids = body.ids.filter((id): id is string => typeof id === "string" && id.length > 0);
  if (ids.length === 0) {
    return NextResponse.json({ error: "IDs invalides." }, { status: 400 });
  }

  await prisma.notification.updateMany({
    where: { userId: sessionUser.id, id: { in: ids }, readAt: null },
    data: { readAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
