import { NextRequest, NextResponse } from "next/server";
import { isAuthFailure, requireRole } from "@/lib/api-auth";
import { getSiteLogoPayload, saveSiteLogo } from "@/lib/siteBranding";

const MAX_LOGO_SIZE_BYTES = 5 * 1024 * 1024;

// GET volontairement public : le logo/branding est affiché sur le site grand public.
export async function GET() {
  const payload = await getSiteLogoPayload();
  return NextResponse.json(payload);
}

export async function POST(request: NextRequest) {
  const sessionUser = await requireRole(request, "admin", {
    forbiddenMessage: "Accès réservé aux administrateurs",
  });
  if (isAuthFailure(sessionUser)) return sessionUser;

  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.includes("multipart/form-data")) {
    return NextResponse.json(
      { error: "Content-Type doit être multipart/form-data" },
      { status: 400 }
    );
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "Aucun fichier image reçu (champ attendu : file)." },
      { status: 400 }
    );
  }

  if (!file.type.startsWith("image/")) {
    return NextResponse.json(
      { error: "Le logo doit être un fichier image." },
      { status: 400 }
    );
  }

  if (file.size > MAX_LOGO_SIZE_BYTES) {
    return NextResponse.json(
      { error: "Le logo dépasse la taille maximale autorisée (5 Mo)." },
      { status: 400 }
    );
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const payload = await saveSiteLogo(buffer, file.type);
    return NextResponse.json(payload, { status: 201 });
  } catch (error) {
    console.error("Erreur upload logo admin", error);
    return NextResponse.json(
      { error: "Impossible d’enregistrer le nouveau logo." },
      { status: 500 }
    );
  }
}
