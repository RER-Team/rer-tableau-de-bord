import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import sanitizeHtml from "sanitize-html";
import { canEditArticles, getSessionUser } from "@/lib/auth";
import { isPublishedStatus } from "@/lib/article-status";

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
    lines.push(toPlainText(article.chapo));
    lines.push("");
  }
  lines.push(toPlainText(article.contenu ?? ""));
  lines.push("");
  if (article.legendePhoto) {
    lines.push("Légende photo");
    lines.push(toPlainText(article.legendePhoto));
    lines.push("");
  }
  if (article.creditPhoto) {
    lines.push("Crédit photo");
    lines.push(toPlainText(article.creditPhoto));
    lines.push("");
  }
  if (article.postRs) {
    lines.push("Post réseaux sociaux");
    lines.push(toPlainText(article.postRs));
  }
  return lines.join("\n");
}

function buildHtmlFragment(article: any): string {
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

  const meta = metaParts.length ? `<p>${escapeHtml(metaParts.join(" · "))}</p>` : "";
  const chapo = article.chapo
    ? `<h2>Chapô</h2><p>${sanitizeArticleHtml(article.chapo)}</p>`
    : "";
  const contenu = sanitizeArticleHtml(article.contenu ?? "");
  const photoLegend = article.legendePhoto
    ? `<p><strong>Légende photo :</strong> ${sanitizeArticleHtml(article.legendePhoto)}</p>`
    : "";
  const photoCredit = article.creditPhoto
    ? `<p><strong>Crédit photo :</strong> ${sanitizeArticleHtml(article.creditPhoto)}</p>`
    : "";
  const postRs = article.postRs
    ? `<h3>Post réseaux sociaux</h3><p>${sanitizeArticleHtml(article.postRs)}</p>`
    : "";

  return `<h1>${escapeHtml(article.titre)}</h1>
${meta}
${chapo}
${contenu}
${photoLegend}
${photoCredit}
${postRs}`.trim();
}

function buildWordHtml(article: any): string {
  const fragment = buildHtmlFragment(article);
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
  <title>${escapeHtml(article.titre)}</title>
</head>
<body>
${fragment}
</body>
</html>`;
}

function toPlainText(value: string): string {
  return sanitizeArticleHtml(value)
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function sanitizeArticleHtml(value: string): string {
  const source = String(value || "");
  const html = source.includes("<")
    ? source
    : source
        .split(/\n{2,}/g)
        .map((paragraph) => paragraph.trim())
        .filter(Boolean)
        .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, "<br />")}</p>`)
        .join("\n");

  return sanitizeHtml(html, {
    allowedTags: [
      "p",
      "br",
      "strong",
      "em",
      "b",
      "i",
      "u",
      "a",
      "h2",
      "h3",
      "h4",
      "ul",
      "ol",
      "li",
      "blockquote",
    ],
    allowedAttributes: {
      a: ["href", "target", "rel"],
    },
    transformTags: {
      a: (tagName, attribs) => ({
        tagName,
        attribs: {
          href: attribs.href || "#",
          target: "_blank",
          rel: "noopener noreferrer",
        },
      }),
    },
  });
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
  const user = await getSessionUser(request);
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

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

  // Même politique que la lecture : un article non publié n'est exportable que
  // par son auteur ou un éditeur.
  const isEditor = canEditArticles(user.role);
  const isAuthor = !!user.auteurId && user.auteurId === article.auteurId;
  if (!isPublishedStatus(article.etat?.slug) && !isEditor && !isAuthor) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const baseName = slugify(article.titre || "article");

  if (format === "html") {
    const html = buildHtmlFragment(article);
    return new NextResponse(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `attachment; filename="${baseName}.html"`,
      },
    });
  }

  if (format === "word" || format === "doc" || format === "docx") {
    const html = buildWordHtml(article);
    return new NextResponse(html, {
      status: 200,
      headers: {
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

