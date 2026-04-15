import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import {
  defaultNotificationPreferences,
  notificationPreferenceSelect,
  sanitizePreferencePatch,
  toNotificationPreferencePayload,
} from "@/lib/notifications/preferences";

export async function GET(request: NextRequest) {
  const sessionUser = await getSessionUser(request);
  if (!sessionUser) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const preference = await prisma.userNotificationPreference.findUnique({
    where: { userId: sessionUser.id },
    select: notificationPreferenceSelect,
  });

  return NextResponse.json(toNotificationPreferencePayload(preference));
}

export async function PATCH(request: NextRequest) {
  const sessionUser = await getSessionUser(request);
  if (!sessionUser) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const body = ((await request.json()) ?? {}) as Record<string, unknown>;
  const patch = sanitizePreferencePatch(body);
  if (Object.keys(patch).length === 0) {
    return NextResponse.json(
      { error: "Aucune préférence valide à mettre à jour." },
      { status: 400 }
    );
  }

  const preference = await prisma.userNotificationPreference.upsert({
    where: { userId: sessionUser.id },
    create: {
      userId: sessionUser.id,
      ...defaultNotificationPreferences,
      ...patch,
    },
    update: patch,
    select: notificationPreferenceSelect,
  });

  return NextResponse.json(toNotificationPreferencePayload(preference));
}
