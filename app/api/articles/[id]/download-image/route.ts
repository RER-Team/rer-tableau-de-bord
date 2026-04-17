import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function slugify(input: string): string {
  const base = input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
  return base || "article";
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const article = await prisma.article.findUnique({
    where: { id },
    select: { titre: true, lienPhoto: true },
  });
  if (!article?.lienPhoto) {
    return NextResponse.json({ error: "Image introuvable." }, { status: 404 });
  }

  const imageResponse = await fetch(article.lienPhoto);
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
