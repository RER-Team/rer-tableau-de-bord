import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser, canEditArticles } from "@/lib/auth";
import {
  getDefaultNotificationTemplate,
  isArticleNotificationEventType,
  validateTemplateVariables,
} from "@/lib/notifications/templates";

function validatePayload(payload: Record<string, unknown>): string | null {
  const keys = [
    "emailSubject",
    "emailText",
    "emailHtml",
    "inAppTitle",
    "inAppBody",
    "pushTitle",
    "pushBody",
  ] as const;
  for (const key of keys) {
    if (typeof payload[key] !== "string" || !payload[key]?.trim()) {
      return `Le champ ${key} est requis.`;
    }
    const invalidVars = validateTemplateVariables(String(payload[key]));
    if (invalidVars.length > 0) {
      return `Variables non autorisees dans ${key}: ${invalidVars.join(", ")}`;
    }
  }
  return null;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ eventType: string }> }
) {
  const user = await getSessionUser(request);
  if (!user || !canEditArticles(user.role)) {
    return NextResponse.json({ error: "Acces refuse" }, { status: 403 });
  }

  const { eventType } = await params;
  if (!isArticleNotificationEventType(eventType)) {
    return NextResponse.json({ error: "eventType invalide" }, { status: 400 });
  }

  const payload = ((await request.json()) ?? {}) as Record<string, unknown>;
  if (payload.resetToDefault === true) {
    const defaults = getDefaultNotificationTemplate(eventType);
    const { eventType: _ignoredEventType, ...restDefaults } = defaults;
    const item = await prisma.notificationTemplate.upsert({
      where: { eventType },
      create: { eventType, ...restDefaults, isActive: true },
      update: { ...restDefaults, isActive: true },
    });
    return NextResponse.json(item);
  }

  const validationError = validatePayload(payload);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const item = await prisma.notificationTemplate.upsert({
    where: { eventType },
    create: {
      eventType,
      emailSubject: String(payload.emailSubject).trim(),
      emailText: String(payload.emailText).trim(),
      emailHtml: String(payload.emailHtml).trim(),
      inAppTitle: String(payload.inAppTitle).trim(),
      inAppBody: String(payload.inAppBody).trim(),
      pushTitle: String(payload.pushTitle).trim(),
      pushBody: String(payload.pushBody).trim(),
      isActive: true,
    },
    update: {
      emailSubject: String(payload.emailSubject).trim(),
      emailText: String(payload.emailText).trim(),
      emailHtml: String(payload.emailHtml).trim(),
      inAppTitle: String(payload.inAppTitle).trim(),
      inAppBody: String(payload.inAppBody).trim(),
      pushTitle: String(payload.pushTitle).trim(),
      pushBody: String(payload.pushBody).trim(),
      isActive: true,
    },
  });

  return NextResponse.json(item);
}
