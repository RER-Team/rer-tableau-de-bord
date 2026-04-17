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

type NotificationStatusFilter = "all" | "read" | "unread";
type NotificationScopeFilter = "all" | "adminArticles" | "authorActions";
type NotificationsView = "default" | "popover";

function parsePositiveInt(rawValue: string | null, fallback: number): number {
  if (!rawValue) return fallback;
  const parsed = Number(rawValue);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.trunc(parsed);
}

function parseStatusFilter(rawValue: string | null): NotificationStatusFilter {
  if (rawValue === "read" || rawValue === "unread") {
    return rawValue;
  }
  return "all";
}

function parseScopeFilter(rawValue: string | null): NotificationScopeFilter {
  if (rawValue === "adminArticles" || rawValue === "authorActions") {
    return rawValue;
  }
  return "all";
}

function parseView(rawValue: string | null): NotificationsView {
  if (rawValue === "popover") return "popover";
  return "default";
}

function getScopeTypes(scope: NotificationScopeFilter): string[] | null {
  if (scope === "authorActions") {
    return [
      "article.submitted",
      "article.submitted.admin_alert",
      "article.corrections_requested_or_resubmitted",
      "article.published.admin_alert",
    ];
  }
  if (scope === "adminArticles") {
    return ["article.published"];
  }
  return null;
}

function resolveNotificationScope(notification: {
  type: string;
  metadata: unknown;
}): Exclude<NotificationScopeFilter, "all"> {
  if (notification.metadata && typeof notification.metadata === "object") {
    const metadataScope = (notification.metadata as Record<string, unknown>).scope;
    if (metadataScope === "adminArticles" || metadataScope === "authorActions") {
      return metadataScope;
    }
  }

  if (
    notification.type === "article.submitted" ||
    notification.type === "article.corrections_requested_or_resubmitted" ||
    notification.type.endsWith(".admin_alert")
  ) {
    return "authorActions";
  }

  return "adminArticles";
}

export async function GET(request: NextRequest) {
  const sessionUser = await getSessionUser(request);
  if (!sessionUser) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const requestedTake = parsePositiveInt(searchParams.get("take"), parsePositiveInt(searchParams.get("limit"), 20));
  const view = parseView(searchParams.get("view"));
  const boundedTake = view === "popover" ? Math.min(20, requestedTake || 12) : Math.min(50, requestedTake);
  const take = Math.max(1, boundedTake);
  const status = parseStatusFilter(searchParams.get("status"));
  const scope = parseScopeFilter(searchParams.get("scope"));
  const cursor = searchParams.get("cursor");
  const scopeTypes = getScopeTypes(scope);

  const where = {
    userId: sessionUser.id,
    ...(status === "read" ? { readAt: { not: null } } : {}),
    ...(status === "unread" ? { readAt: null } : {}),
    ...(scopeTypes ? { type: { in: scopeTypes } } : {}),
  };

  const [rawItems, unreadCount, totalCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: take + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: notificationSelect,
    }),
    prisma.notification.count({
      where: { userId: sessionUser.id, readAt: null },
    }),
    prisma.notification.count({
      where: { userId: sessionUser.id },
    }),
  ]);

  const scopedItems = scopeTypes
    ? rawItems
    : scope === "all"
      ? rawItems
      : rawItems.filter((item) => resolveNotificationScope(item) === scope);

  const hasMore = rawItems.length > take;
  const items = scopedItems.slice(0, take);
  const nextCursor = rawItems.length > 0 ? rawItems[Math.min(take, rawItems.length) - 1]?.id ?? null : null;

  return NextResponse.json({
    items,
    unreadCount,
    totalCount,
    hasMore,
    nextCursor: hasMore ? nextCursor : null,
  });
}

export async function PATCH(request: NextRequest) {
  const sessionUser = await getSessionUser(request);
  if (!sessionUser) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const body = ((await request.json()) ?? {}) as {
    ids?: unknown;
    markAllRead?: unknown;
    markUnread?: unknown;
  };

  if (body.markUnread === true) {
    if (!Array.isArray(body.ids) || body.ids.length === 0) {
      return NextResponse.json(
        { error: "Veuillez préciser des notifications à marquer comme non lues." },
        { status: 400 }
      );
    }

    const ids = body.ids.filter((id): id is string => typeof id === "string" && id.length > 0);
    if (ids.length === 0) {
      return NextResponse.json({ error: "IDs invalides." }, { status: 400 });
    }

    const result = await prisma.notification.updateMany({
      where: { userId: sessionUser.id, id: { in: ids }, readAt: { not: null } },
      data: { readAt: null },
    });
    return NextResponse.json({ ok: true, updatedCount: result.count });
  }

  if (body.markAllRead === true) {
    const result = await prisma.notification.updateMany({
      where: { userId: sessionUser.id, readAt: null },
      data: { readAt: new Date() },
    });
    return NextResponse.json({ ok: true, updatedCount: result.count });
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

  const result = await prisma.notification.updateMany({
    where: { userId: sessionUser.id, id: { in: ids }, readAt: null },
    data: { readAt: new Date() },
  });

  return NextResponse.json({ ok: true, updatedCount: result.count });
}

export async function DELETE(request: NextRequest) {
  const sessionUser = await getSessionUser(request);
  if (!sessionUser) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const body = ((await request.json()) ?? {}) as {
    ids?: unknown;
    readOnly?: unknown;
    all?: unknown;
  };

  const modeCount = Number(body.all === true) + Number(body.readOnly === true) + Number(!!body.ids);
  if (modeCount !== 1) {
    return NextResponse.json(
      { error: "Précisez un seul mode de suppression: ids, readOnly ou all." },
      { status: 400 }
    );
  }

  if (body.all === true) {
    const result = await prisma.notification.deleteMany({
      where: { userId: sessionUser.id },
    });
    return NextResponse.json({ ok: true, deletedCount: result.count });
  }

  if (body.readOnly === true) {
    const result = await prisma.notification.deleteMany({
      where: { userId: sessionUser.id, readAt: { not: null } },
    });
    return NextResponse.json({ ok: true, deletedCount: result.count });
  }

  if (!Array.isArray(body.ids) || body.ids.length === 0) {
    return NextResponse.json(
      { error: "Veuillez préciser des notifications à supprimer." },
      { status: 400 }
    );
  }

  const ids = body.ids.filter((id): id is string => typeof id === "string" && id.length > 0);
  if (ids.length === 0) {
    return NextResponse.json({ error: "IDs invalides." }, { status: 400 });
  }

  const result = await prisma.notification.deleteMany({
    where: { userId: sessionUser.id, id: { in: ids } },
  });

  return NextResponse.json({ ok: true, deletedCount: result.count });
}
