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

function buildText(article: any): string {
  const lines: string[] = [];
  lines.push(article.titre);
  lines.push("");
  const meta: string[] = [];
  if (article.auteur) {
    meta.push(`${article.auteur.prenom} ${article.auteur.nom}`);
  }
  if (article.mutuelle) meta.push(`Mutuelle : ${article.mutuelle.nom}`);
  if (article.rubrique) meta.push(`Rubrique : ${article.rubrique.libelle}`);
  if (article.format) meta.push(`Format : ${article.format.libelle}`);
  if (article.etat) meta.push(`État : ${article.etat.libelle}`);
  if (meta.length) {
    lines.push(meta.join(" · "));
    lines.push("");
  }
  if (article.chapo) {
    lines.push("Chapô");
    lines.push(article.chapo);
    lines.push("");
  }
  lines.push(article.contenu ?? "");
  lines.push("");
  if (article.postRs) {
    lines.push("Post réseaux sociaux");
    lines.push(article.postRs);
  }
  return lines.join("\n");
}

function buildHtml(article: any): string {
  const metaParts: string[] = [];
  if (article.auteur) {
    metaParts.push(
      `${article.auteur.prenom} ${article.auteur.nom}`
    );
  }
  if (article.mutuelle) metaParts.push(`Mutuelle : ${article.mutuelle.nom}`);
  if (article.rubrique) metaParts.push(`Rubrique : ${article.rubrique.libelle}`);
  if (article.format) metaParts.push(`Format : ${article.format.libelle}`);
  if (article.etat) metaParts.push(`État : ${article.etat.libelle}`);

  const meta = metaParts.length ? `<p>${metaParts.join(" · ")}</p>` : "";
  const chapo = article.chapo
    ? `<h2>Chapô</h2><p>${escapeHtml(article.chapo)}</p>`
    : "";
  const contenu = `<p>${escapeHtml(article.contenu ?? "")
    .replace(/\n{2,}/g, "</p><p>")
    .replace(/\n/g, "<br />")}</p>`;
  const postRs = article.postRs
    ? `<h3>Post réseaux sociaux</h3><p>${escapeHtml(article.postRs)}</p>`
    : "";

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(article.titre)}</title>
</head>
<body>
  <h1>${escapeHtml(article.titre)}</h1>
  ${meta}
  ${chapo}
  ${contenu}
  ${postRs}
</body>
</html>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const format = (searchParams.get("format") || "txt").toLowerCase();

  const article = await prisma.article.findUnique({
    where: { id },
    include: {
      auteur: true,
      mutuelle: true,
      rubrique: true,
      format: true,
      etat: true,
    },
  });

  if (!article) {
    return NextResponse.json({ error: "Article introuvable" }, { status: 404 });
  }

  const baseName = slugify(article.titre || "article");

  if (format === "html") {
    const html = buildHtml(article);
    return new NextResponse(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `attachment; filename="${baseName}.html"`,
      },
    });
  }

  if (format === "word" || format === "doc" || format === "docx") {
    const html = buildHtml(article);
    return new NextResponse(html, {
      status: 200,
      headers: {
        // Word ouvre très bien de l'HTML avec ce mime-type
        "Content-Type": "application/msword; charset=utf-8",
        "Content-Disposition": `attachment; filename="${baseName}.doc"`,
      },
    });
  }

  const text = buildText(article);
  return new NextResponse(text, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="${baseName}.txt"`,
    },
  });
}

