import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser, canEditArticles } from "@/lib/auth";
import { ingestDebug } from "@/lib/ingest-debug";
import {
  isDraftStatus,
  isPublishedStatus,
  normalizeArticleStatusSlug,
} from "@/lib/article-status";
import { sanitizeArticleHtml } from "@/lib/sanitizeArticleHtml";
import { buildArticleNotificationEvents } from "@/lib/notifications/article-events";
import { dispatchArticleNotificationEvent } from "@/lib/notifications/dispatch";

const historiqueUserSelect = {
  id: true,
  email: true,
  role: true,
};

const articlePreviewSelect = {
  id: true,
  titre: true,
  chapo: true,
  contenu: true,
  contenuJson: true,
  lienPhoto: true,
  legendePhoto: true,
  creditPhoto: true,
  postRs: true,
  dateDepot: true,
  datePublication: true,
  createdAt: true,
  auteurId: true,
  mutuelleId: true,
  rubriqueId: true,
  formatId: true,
  lienGoogleDoc: true,
  auteur: { select: { prenom: true, nom: true } },
  mutuelle: { select: { nom: true } },
  rubrique: { select: { libelle: true } },
  format: { select: { libelle: true } },
  etat: { select: { libelle: true, slug: true } },
  isExemplePublic: true,
};

function extractFirstImageSrc(html: string | null): string | null {
  if (!html) return null;
  const matches = Array.from(
    html.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)
  );
  if (matches.length === 1) {
    return matches[0][1];
  }
  return null;
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
  const scope = request.nextUrl.searchParams.get("scope");
  const article =
    scope === "preview"
      ? await prisma.article.findUnique({
          where: { id },
          select: articlePreviewSelect,
        })
      : await prisma.article.findUnique({
          where: { id },
          include: {
            auteur: true,
            mutuelle: true,
            rubrique: true,
            format: true,
            etat: true,
            historiques: {
              orderBy: { createdAt: "desc" },
              include: { etat: true, user: { select: historiqueUserSelect } },
            },
          },
        });
  if (!article) return NextResponse.json({ error: "Article introuvable" }, { status: 404 });

  // Contrôle d'accès : un article non publié n'est lisible que par son auteur
  // ou par un éditeur (relecteur/admin). Les articles publiés restent lisibles
  // par tout membre connecté.
  const isEditor = canEditArticles(user.role);
  const isAuthor = !!user.auteurId && user.auteurId === article.auteurId;
  if (!isPublishedStatus(article.etat?.slug) && !isEditor && !isAuthor) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  // Pour les non-éditeurs, on n'expose jamais l'email/le rôle des relecteurs
  // présents dans l'historique des changements d'état.
  const articleWithHistoriques = article as {
    historiques?: Array<Record<string, unknown>>;
  };
  if (!isEditor && Array.isArray(articleWithHistoriques.historiques)) {
    articleWithHistoriques.historiques = articleWithHistoriques.historiques.map(
      (h) => ({ ...h, user: null })
    );
  }

  return NextResponse.json(article);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser(request);
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { id } = await params;
  const ensureEtatBySlug = async (
    slug:
      | "brouillon"
      | "a_relire"
      | "publie"
  ) => {
    let etat = await prisma.etat.findFirst({ where: { slug } });
    if (etat) return etat;
    const config =
      slug === "brouillon"
        ? { libelle: "Brouillon", ordre: -1 }
        : slug === "a_relire"
        ? { libelle: "À relire", ordre: 1 }
        : { libelle: "Publié", ordre: 2 };
    return prisma.etat.create({
      data: {
        slug,
        libelle: config.libelle,
        ordre: config.ordre,
      },
    });
  };
  const existing = await prisma.article.findUnique({
    where: { id },
    select: {
      id: true,
      auteurId: true,
      etatId: true,
      isExemplePublic: true,
      datePublication: true,
      dateDepot: true,
      contenu: true,
      lienPhoto: true,
      etat: { select: { slug: true } },
    },
  });
  if (!existing) return NextResponse.json({ error: "Article introuvable" }, { status: 404 });
  const isEditor = canEditArticles(user.role);
  const isAuthor = !!user.auteurId && user.auteurId === existing.auteurId;
  if (!isEditor && !isAuthor) {
    return NextResponse.json(
      { error: "Vous n’êtes pas autorisé à modifier cet article." },
      { status: 403 }
    );
  }
  if (!isEditor && isPublishedStatus(existing.etat?.slug)) {
    return NextResponse.json(
      { error: "Les auteurs ne peuvent plus modifier un article publié." },
      { status: 403 }
    );
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });
  }

  ingestDebug({
    sessionId: "fb943b",
    runId: "pre-fix",
    hypothesisId: "H_API_PATCH",
    location: "app/api/articles/[id]/route.ts:PATCH:beforeUpdate",
    message: "PATCH /api/articles/[id] called",
    data: { articleId: id, keys: Object.keys(body ?? {}) },
  });
  const {
    titre,
    chapo,
    contenu,
    contenuHtml,
    contenuJson,
    etatId,
    etatSlug,
    auteurId,
    mutuelleId,
    rubriqueId,
    formatId,
    legendePhoto,
    creditPhoto,
    postRs,
    lienPhoto,
    lienGoogleDoc,
    isExemplePublic,
  } = body;

  const data: Record<string, unknown> = {};
  const hasEditableFieldChange = [
    titre,
    chapo,
    contenu,
    contenuHtml,
    contenuJson,
    auteurId,
    mutuelleId,
    rubriqueId,
    formatId,
    legendePhoto,
    creditPhoto,
    postRs,
    lienPhoto,
    lienGoogleDoc,
  ].some((value) => value !== undefined);
  if (typeof titre === "string") data.titre = titre.trim();
  if (chapo !== undefined) data.chapo = chapo?.trim() || null;
  let finalContenuHtml: string | null = null;
  if (
    typeof contenuHtml === "string" ||
    typeof contenu === "string" ||
    contenuJson !== undefined
  ) {
    const computed: string =
      (typeof contenuHtml === "string" && contenuHtml.trim()) ||
      (typeof contenu === "string" && contenu.trim()) ||
      existing.contenu;
    const sanitizedContenuHtml = sanitizeArticleHtml(computed).trim() || "<p></p>";
    finalContenuHtml = sanitizedContenuHtml;
    data.contenu = sanitizedContenuHtml;
    if (contenuJson !== undefined) {
      data.contenuJson = contenuJson;
    }
  }
  if (etatId !== undefined) {
    if (!isEditor) {
      return NextResponse.json(
        { error: "Modification d’état réservée aux relecteurs et administrateurs." },
        { status: 403 }
      );
    }
    if (!etatId) {
      data.etatId = null;
    } else {
      const requestedEtat = await prisma.etat.findUnique({
        where: { id: etatId },
        select: { slug: true },
      });
      const normalizedSlug = normalizeArticleStatusSlug(requestedEtat?.slug);
      if (!normalizedSlug) {
        return NextResponse.json(
          { error: "Transition d’état non autorisée." },
          { status: 400 }
        );
      }
      const canonicalEtat = await ensureEtatBySlug(normalizedSlug);
      data.etatId = canonicalEtat.id;
    }
  } else if (typeof etatSlug === "string" && etatSlug.trim()) {
    const targetSlug = normalizeArticleStatusSlug(etatSlug.trim());
    if (!targetSlug) {
      return NextResponse.json(
        { error: "Transition d’état non autorisée." },
        { status: 400 }
      );
    }
    if (
      !isEditor &&
      targetSlug !== "brouillon" &&
      targetSlug !== "a_relire"
    ) {
      return NextResponse.json(
        { error: "Transition d’état non autorisée." },
        { status: 403 }
      );
    }
    if (!isEditor && targetSlug === "brouillon" && !isDraftStatus(existing.etat?.slug)) {
      return NextResponse.json(
        { error: "Un article soumis ne peut pas redevenir brouillon." },
        { status: 403 }
      );
    }
    const targetEtat = await ensureEtatBySlug(targetSlug);
    data.etatId = targetEtat?.id ?? null;
  }
  if (auteurId !== undefined && typeof auteurId === "string" && auteurId.trim()) {
    if (!isEditor && auteurId.trim() !== existing.auteurId) {
      return NextResponse.json(
        { error: "Changement d’auteur réservé aux relecteurs et administrateurs." },
        { status: 403 }
      );
    }
    data.auteurId = auteurId.trim();
  }
  if (mutuelleId !== undefined) data.mutuelleId = mutuelleId || null;
  if (rubriqueId !== undefined) data.rubriqueId = rubriqueId || null;
  if (formatId !== undefined) data.formatId = formatId || null;
  if (legendePhoto !== undefined) data.legendePhoto = legendePhoto?.trim() || null;
  if (creditPhoto !== undefined) data.creditPhoto = creditPhoto?.trim() || null;
  if (postRs !== undefined) data.postRs = postRs?.trim() || null;
  if (lienPhoto !== undefined) {
    data.lienPhoto = lienPhoto?.trim() || null;
  } else if (!existing.lienPhoto && finalContenuHtml != null) {
    const autoLienPhoto = extractFirstImageSrc(finalContenuHtml);
    if (autoLienPhoto) {
      data.lienPhoto = autoLienPhoto;
    }
  }
  if (lienGoogleDoc !== undefined) data.lienGoogleDoc = lienGoogleDoc?.trim() || null;
  if (isExemplePublic !== undefined) {
    if (!isEditor) {
      return NextResponse.json(
        { error: "Option vitrine réservée aux relecteurs et administrateurs." },
        { status: 403 }
      );
    }
    data.isExemplePublic = Boolean(isExemplePublic);
  }

  const authorResubmitted =
    !isEditor && hasEditableFieldChange && !isDraftStatus(existing.etat?.slug);

  if (authorResubmitted) {
    const reviewEtat = await ensureEtatBySlug("a_relire");
    data.etatId = reviewEtat.id;
    data.dateDepot = new Date();
  }

  const previousEtatId = existing.etatId;
  const newEtatId = (data.etatId as string | null) ?? previousEtatId;
  const etatChanged = newEtatId !== previousEtatId;
  const previousStatusSlug = normalizeArticleStatusSlug(existing.etat?.slug ?? null);

  // Si l'état change vers "publie" et que datePublication est encore vide,
  // on fige la date de validation à maintenant.
  if (etatChanged && newEtatId) {
    const etatCible = await prisma.etat.findUnique({
      where: { id: newEtatId },
      select: { slug: true },
    });
    if (
      normalizeArticleStatusSlug(etatCible?.slug) === "publie" &&
      !existing.datePublication &&
      data.datePublication === undefined
    ) {
      data.datePublication = new Date();
    }
    if (
      normalizeArticleStatusSlug(etatCible?.slug) !== "brouillon" &&
      !existing.dateDepot &&
      data.dateDepot === undefined
    ) {
      data.dateDepot = new Date();
    }
  }

  const article = await prisma.article.update({
    where: { id },
    data,
    include: {
      auteur: true,
      mutuelle: true,
      rubrique: true,
      format: true,
      etat: true,
      historiques: {
        orderBy: { createdAt: "desc" },
        include: { etat: true, user: { select: historiqueUserSelect } },
      },
    },
  });

  if ((etatChanged || authorResubmitted) && newEtatId) {
    const etatCible = await prisma.etat.findUnique({
      where: { id: newEtatId },
      select: { slug: true, libelle: true },
    });

    await prisma.articleHistorique.create({
      data: {
        articleId: id,
        etatId: newEtatId,
        userId: user?.id ?? null,
      },
    });
  }

  ingestDebug({
    sessionId: "fb943b",
    runId: "pre-fix",
    hypothesisId: "H_API_PATCH",
    location: "app/api/articles/[id]/route.ts:PATCH:afterUpdate",
    message: "PATCH /api/articles/[id] completed",
    data: { articleId: id, etatChanged, newEtatId },
  });

  const events = buildArticleNotificationEvents({
    articleId: article.id,
    actorUserId: user.id,
    targetAuteurId: article.auteurId,
    isCreate: false,
    fromStatusSlug: previousStatusSlug,
    toStatusSlug: article.etat?.slug ?? null,
    authorResubmitted,
  });

  for (const event of events) {
    try {
      await dispatchArticleNotificationEvent({ event });
    } catch (error) {
      console.error("dispatchArticleNotificationEvent PATCH /api/articles/[id]", error);
    }
  }

  return NextResponse.json(article);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser(request);
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { id } = await params;
  const existing = await prisma.article.findUnique({
    where: { id },
    select: { id: true, auteurId: true, etat: { select: { slug: true } } },
  });
  if (!existing) {
    return NextResponse.json({ error: "Article introuvable" }, { status: 404 });
  }

  const isAuthor = user.auteurId && user.auteurId === existing.auteurId;
  const isAdmin = user.role === "admin";

  if (!isAdmin && !isAuthor) {
    return NextResponse.json(
      { error: "Vous n’êtes pas autorisé à supprimer cet article." },
      { status: 403 }
    );
  }

  const normalizedStatus = normalizeArticleStatusSlug(existing.etat?.slug);
  if (!isAdmin && isAuthor && normalizedStatus !== "brouillon" && normalizedStatus !== "a_relire") {
    return NextResponse.json(
      {
        error:
          "Les auteurs ne peuvent supprimer que les brouillons et les articles soumis à relecture.",
      },
      { status: 403 }
    );
  }

  await prisma.article.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
