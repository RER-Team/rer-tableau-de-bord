import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { getPasswordPolicyMessage, isPasswordValid } from "@/lib/password-policy";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const sessionUser = await getSessionUser(request);
  if (!sessionUser || sessionUser.role !== "admin") {
    return NextResponse.json(
      { error: "Accès réservé aux administrateurs" },
      { status: 403 }
    );
  }

  const { id } = await params;
  let body: { password?: string };
  try {
    body = (await request.json()) as { password?: string };
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });
  }
  const { password } = body as { password?: string };

  if (!password || typeof password !== "string" || !isPasswordValid(password)) {
    return NextResponse.json(
      { error: getPasswordPolicyMessage() },
      { status: 400 }
    );
  }

  const hash = await bcrypt.hash(password, 10);

  await prisma.user.update({
    where: { id },
    data: { passwordHash: hash },
  });

  return NextResponse.json({ ok: true });
}

