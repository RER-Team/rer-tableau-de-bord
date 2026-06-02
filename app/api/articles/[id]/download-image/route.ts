import { NextRequest, NextResponse } from "next/server";
import { isIP } from "node:net";
import { lookup } from "node:dns/promises";
import { prisma } from "@/lib/prisma";
import { canEditArticles, getSessionUser } from "@/lib/auth";
import { isPublishedStatus } from "@/lib/article-status";
import { isPublicReadableArticle } from "@/lib/public-article-read";

function slugify(input: string): string {
  const base = input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
  return base || "article";
}

/** Détecte les IP privées / loopback / link-local / métadonnées cloud. */
function isBlockedIp(ip: string): boolean {
  const v = ip.toLowerCase();
  // IPv6 loopback / non spécifié / link-local / unique-local
  if (v === "::1" || v === "::" || v === "::0") return true;
  if (v.startsWith("fe80:") || v.startsWith("fc") || v.startsWith("fd")) return true;
  // IPv4-mapped IPv6 (ex: ::ffff:127.0.0.1)
  const mapped = v.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  const target = mapped ? mapped[1] : v;

  const parts = target.split(".");
  if (parts.length === 4 && parts.every((p) => /^\d+$/.test(p))) {
    const [a, b] = parts.map((p) => parseInt(p, 10));
    if (a === 127) return true; // 127.0.0.0/8 loopback
    if (a === 10) return true; // 10.0.0.0/8
    if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
    if (a === 192 && b === 168) return true; // 192.168.0.0/16
    if (a === 169 && b === 254) return true; // 169.254.0.0/16 (incl. métadonnées 169.254.169.254)
    if (a === 0) return true; // 0.0.0.0/8
    if (a >= 224) return true; // multicast / réservé
  }
  return false;
}

/**
 * Valide qu'une URL est http(s) et ne pointe pas vers une cible interne.
 * Retourne l'URL validée ou null si elle doit être rejetée (anti-SSRF).
 */
async function resolveSafeImageUrl(rawUrl: string): Promise<URL | null> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;

  const host = url.hostname.toLowerCase();
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host === "metadata.google.internal"
  ) {
    return null;
  }

  if (isIP(host)) {
    return isBlockedIp(host) ? null : url;
  }

  // Résolution DNS : on bloque si l'hôte résout vers une IP interne
  // (protection contre le DNS rebinding).
  try {
    const records = await lookup(host, { all: true });
    if (records.length === 0) return null;
    if (records.some((r) => isBlockedIp(r.address))) return null;
  } catch {
    return null;
  }

  return url;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser(request);
  const { id } = await params;
  const article = await prisma.article.findUnique({
    where: { id },
    select: {
      titre: true,
      lienPhoto: true,
      auteurId: true,
      etat: { select: { slug: true } },
    },
  });
  if (!article?.lienPhoto) {
    return NextResponse.json({ error: "Image introuvable." }, { status: 404 });
  }

  if (!user) {
    if (!isPublicReadableArticle(article.etat?.slug)) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }
  } else {
    const isEditor = canEditArticles(user.role);
    const isAuthor = !!user.auteurId && user.auteurId === article.auteurId;
    if (!isPublishedStatus(article.etat?.slug) && !isEditor && !isAuthor) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }
  }

  const safeUrl = await resolveSafeImageUrl(article.lienPhoto);
  if (!safeUrl) {
    return NextResponse.json(
      { error: "URL d'image non autorisée." },
      { status: 400 }
    );
  }

  let imageResponse: Response;
  try {
    // redirect: manual : on refuse les redirections pour éviter un contournement
    // de la validation SSRF vers une cible interne.
    imageResponse = await fetch(safeUrl, { redirect: "manual" });
  } catch {
    return NextResponse.json(
      { error: "Impossible de récupérer l'image." },
      { status: 502 }
    );
  }

  if (imageResponse.status >= 300 && imageResponse.status < 400) {
    return NextResponse.json(
      { error: "Redirection non autorisée pour cette image." },
      { status: 502 }
    );
  }
  if (!imageResponse.ok) {
    return NextResponse.json({ error: "Impossible de récupérer l'image." }, { status: 502 });
  }

  const contentType = imageResponse.headers.get("content-type") || "application/octet-stream";
  const extension = resolveExtension(contentType);
  const filename = `${slugify(article.titre)}-image.${extension}`;
  const data = await imageResponse.arrayBuffer();

  return new NextResponse(data, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, max-age=300",
    },
  });
}

function resolveExtension(contentType: string): string {
  if (contentType.includes("jpeg")) return "jpg";
  if (contentType.includes("png")) return "png";
  if (contentType.includes("webp")) return "webp";
  if (contentType.includes("gif")) return "gif";
  if (contentType.includes("svg")) return "svg";
  return "bin";
}
