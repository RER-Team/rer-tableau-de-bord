import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { canEditArticles, getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getUploadUrl } from "@/lib/storage";

const MAX_IMAGE_SIZE_BYTES = 6 * 1024 * 1024; // filet de sécu (~6 Mo après compression)

// Whitelist stricte de types MIME image (SVG exclu : vecteur d'injection script).
const ALLOWED_IMAGE_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

type Body = {
  filename?: string;
  contentType?: string;
  articleId?: string | null;
  size?: number;
};

export async function POST(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });
  }

  const filename = (body.filename ?? "").trim();
  const contentType = (body.contentType ?? "").trim().toLowerCase();
  const articleId = body.articleId?.trim() || null;
  const size = typeof body.size === "number" ? body.size : undefined;

  if (!filename || !contentType) {
    return NextResponse.json(
      { error: "Champs requis : filename, contentType" },
      { status: 400 }
    );
  }

  if (!ALLOWED_IMAGE_MIME.has(contentType)) {
    return NextResponse.json(
      { error: "Type d'image non autorisé (formats acceptés : JPEG, PNG, WebP, GIF)." },
      { status: 400 }
    );
  }

  if (size != null && size > MAX_IMAGE_SIZE_BYTES) {
    return NextResponse.json(
      { error: "Image trop volumineuse après compression." },
      { status: 400 }
    );
  }

  const extensionFromName =
    filename.lastIndexOf(".") !== -1
      ? filename.slice(filename.lastIndexOf(".") + 1).toLowerCase()
      : null;

  const safeExt =
    extensionFromName && /^[a-z0-9]+$/.test(extensionFromName)
      ? extensionFromName
      : inferExtensionFromMime(contentType) ?? "jpg";

  // L'utilisateur ne peut ranger l'image dans articles/{articleId}/ que s'il est
  // éditeur ou l'auteur de cet article. Sinon, on retombe sur le dossier "misc".
  let safeArticlePart = "misc";
  if (articleId && /^[a-zA-Z0-9_-]+$/.test(articleId)) {
    if (canEditArticles(user.role)) {
      safeArticlePart = articleId;
    } else if (user.auteurId) {
      const article = await prisma.article.findUnique({
        where: { id: articleId },
        select: { auteurId: true },
      });
      if (article && article.auteurId === user.auteurId) {
        safeArticlePart = articleId;
      }
    }
  }

  const id = randomUUID();
  const objectKey = `articles/${safeArticlePart}/${id}.${safeExt}`;

  try {
    const result = await getUploadUrl({
      key: objectKey,
      contentType,
      maxSizeBytes: MAX_IMAGE_SIZE_BYTES,
      size,
    });

    return NextResponse.json(
      {
        path: result.path,
        token: result.token,
        key: result.key,
        publicUrl: result.publicUrl,
      },
      { status: 200 }
    );
  } catch (e) {
    // Détail loggé côté serveur uniquement ; message générique côté client.
    console.error("Erreur création URL upload Supabase", e);
    return NextResponse.json(
      { error: "Impossible de générer l’URL d’upload." },
      { status: 500 }
    );
  }
}

function inferExtensionFromMime(mime: string): string | null {
  if (mime === "image/jpeg" || mime === "image/jpg") return "jpg";
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "image/gif") return "gif";
  return null;
}

