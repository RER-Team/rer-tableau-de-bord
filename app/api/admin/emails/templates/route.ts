import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import {
  articleNotificationEventTypes,
  getDefaultNotificationTemplate,
} from "@/lib/notifications/templates";

export async function GET(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Accès réservé aux administrateurs" }, { status: 403 });
  }

  const templates = await prisma.notificationTemplate.findMany({
    where: { eventType: { in: articleNotificationEventTypes } },
    orderBy: { eventType: "asc" },
  });
  const byEvent = new Map(templates.map((item) => [item.eventType, item]));

  const items = articleNotificationEventTypes.map((eventType) => {
    const dbTemplate = byEvent.get(eventType);
    if (dbTemplate) return dbTemplate;
    const defaults = getDefaultNotificationTemplate(eventType);
    const { eventType: _ignoredEventType, ...restDefaults } = defaults;
    return {
      id: `default-${eventType}`,
      eventType,
      ...restDefaults,
      isActive: false,
      createdAt: new Date(0),
      updatedAt: new Date(0),
    };
  });

  return NextResponse.json({ items });
}
