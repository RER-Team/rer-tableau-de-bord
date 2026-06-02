import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { canEditArticles, getSessionUser } from "@/lib/auth";
import { ingestDebug } from "@/lib/ingest-debug";
import { getStatusWhereClause, normalizeArticleStatusSlug } from "@/lib/article-status";
import { sanitizeArticleHtml } from "@/lib/sanitizeArticleHtml";
import { buildArticleNotificationEvents } from "@/lib/notifications/article-events";
import { dispatchArticleNotificationEvent } from "@/lib/notifications/dispatch";
import {
  buildArticleTextSearchWhere,
  mergeArticleWhereClauses,
} from "@/lib/article-search-where";

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

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));
  const skip = (page - 1) * limit;

  const q = (searchParams.get("q") ?? "").trim();
  const etatSlug = searchParams.get("etat") ?? "";
  const mutuelleParam = searchParams.get("mutuelleId") ?? "";
  const rubriqueParam = searchParams.get("rubriqueId") ?? "";
  const formatParam = searchParams.get("formatId") ?? "";
  const sinceParam = searchParams.get("since") ?? "";
  const fromParam = searchParams.get("from") ?? "";
  const toParam = searchParams.get("to") ?? "";
  const mineParam = searchParams.get("mine") ?? "";
  const scopeParam = searchParams.get("scope") ?? "";

  const isPublicScope = scopeParam === "public";
  const isMine = mineParam === "1";

  const where: any = {};

  const textSearchWhere = buildArticleTextSearchWhere(q);

  // --- Contrôle d'accès ---
  // - scope public : lecture anonyme autorisée mais bornée aux articles publiés ;
  // - "Mes articles" : auteur connecté uniquement (ses propres contenus) ;
  // - sinon (liste complète / états non publiés) : réservé aux éditeurs.
  if (isMine) {
    const sessionUser = await getSessionUser(request);
    if (!sessionUser?.auteurId) {
      return NextResponse.json(
        { error: "Utilisateur non authentifié ou auteur non associé" },
        { status: 401 }
      );
    }
    where.auteurId = sessionUser.auteurId;
  } else if (!isPublicScope) {
    const sessionUser = await getSessionUser(request);
    if (!sessionUser) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }
    if (!canEditArticles(sessionUser.role)) {
      return NextResponse.json(
        { error: "Accès refusé : liste réservée aux éditeurs." },
        { status: 403 }
      );
    }
  }

  // En scope public, on force toujours l'état « publié » quelles que soient
  // les valeurs d'état demandées par le client.
  const effectiveEtatSlug = isPublicScope ? "publie" : etatSlug;
  const etatWhere = getStatusWhereClause(effectiveEtatSlug);
  if (etatWhere) {
    where.etat = etatWhere;
  }

  const dateFilter: any = {};
  const fromDate = fromParam ? new Date(fromParam) : null;
  const sinceDate = sinceParam ? new Date(sinceParam) : null;
  const toDate = toParam ? new Date(toParam) : null;
  if (fromDate && !Number.isNaN(fromDate.getTime())) {
    dateFilter.gte = fromDate;
  } else if (sinceDate && !Number.isNaN(sinceDate.getTime())) {
    dateFilter.gte = sinceDate;
  }
  if (toDate && !Number.isNaN(toDate.getTime())) {
    dateFilter.lte = toDate;
  }
  const dateOrClause: any[] = [];
  if (Object.keys(dateFilter).length > 0) {
    // On filtre en priorité sur la date de validation (datePublication).
    // Pour les anciens contenus non validés, on retombe sur createdAt.
    dateOrClause.push(
      {
        AND: [
          { datePublication: { not: null } },
          { datePublication: dateFilter },
        ],
      },
      {
        AND: [
          { datePublication: null },
          { createdAt: dateFilter },
        ],
      },
    );
  }

  const mutuelleIds = mutuelleParam
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
  if (mutuelleIds.length === 1) {
    where.mutuelleId = mutuelleIds[0];
  } else if (mutuelleIds.length > 1) {
    where.mutuelleId = { in: mutuelleIds };
  }

  const rubriqueIds = rubriqueParam
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
  if (rubriqueIds.length === 1) {
    where.rubriqueId = rubriqueIds[0];
  } else if (rubriqueIds.length > 1) {
    where.rubriqueId = { in: rubriqueIds };
  }

  const formatIds = formatParam
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
  if (formatIds.length === 1) {
    where.formatId = formatIds[0];
  } else if (formatIds.length > 1) {
    where.formatId = { in: formatIds };
  }
  const finalWhere = mergeArticleWhereClauses(
    where,
    textSearchWhere,
    dateOrClause.length ? dateOrClause : undefined
  );

  const [articles, total] = await Promise.all([
    prisma.article.findMany({
      where: finalWhere,
      skip,
      take: limit,
      orderBy: [
        // On essaie d’abord de trier par date de dépôt / publication,
        // puis on retombe sur createdAt pour les anciens contenus.
        { dateDepot: "desc" },
        { createdAt: "desc" },
      ],
      select: {
        id: true,
        titre: true,
        chapo: true,
        lienPhoto: true,
        legendePhoto: true,
        creditPhoto: true,
        dateDepot: true,
        datePublication: true,
        createdAt: true,
        updatedAt: true,
        auteurId: true,
        mutuelleId: true,
        rubriqueId: true,
        formatId: true,
        etatId: true,
        auteur: { select: { id: true, prenom: true, nom: true } },
        mutuelle: { select: { id: true, nom: true } },
        rubrique: { select: { id: true, libelle: true } },
        format: { select: { id: true, libelle: true } },
        etat: { select: { id: true, libelle: true, slug: true } },
      },
    }),
    prisma.article.count({ where: finalWhere }),
  ]);
  return NextResponse.json({ articles, total, page, limit });
}

export async function POST(request: NextRequest) {
  try {
    const sessionUser = await getSessionUser(request);
    if (!sessionUser) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });
    }
    const {
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
      etatSlug,
      isDraft,
    } = body;

    const finalContenuHtml: string | null =
      typeof contenuHtml === "string" && contenuHtml.trim()
        ? contenuHtml
        : typeof contenu === "string" && contenu.trim()
        ? contenu
        : null;

    const requestedSlug =
      typeof etatSlug === "string" ? etatSlug.trim() : "";
    const targetSlug = normalizeArticleStatusSlug(
      requestedSlug || (isDraft === true ? "brouillon" : "a_relire")
    );
    const draftMode = targetSlug === "brouillon";

    if (!targetSlug) {
      return NextResponse.json(
        { error: "État d’article invalide." },
        { status: 400 }
      );
    }

    // En brouillon, on autorise un titre / contenu vides.
    // En mode normal, on garde les validations strictes.
    const safeTitre =
      typeof titre === "string" && titre.trim()
        ? titre.trim()
        : draftMode
        ? "Sans titre"
        : "";
    const safeContenuHtml =
      finalContenuHtml && finalContenuHtml.trim()
        ? finalContenuHtml.trim()
        : draftMode
        ? "<p></p>"
        : "";
    const sanitizedContenuHtml = sanitizeArticleHtml(safeContenuHtml).trim() || "<p></p>";

    if (!auteurId || typeof auteurId !== "string" || !auteurId.trim()) {
      return NextResponse.json(
        { error: "Champs requis : auteurId" },
        { status: 400 }
      );
    }
    const safeAuteurId = auteurId.trim();
    const isEditor = canEditArticles(sessionUser.role);
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
    if (!isEditor && !sessionUser.auteurId) {
      return NextResponse.json(
        {
          error:
            "Votre compte n’est pas lié à un profil auteur. Contactez un administrateur pour finaliser votre accès.",
        },
        { status: 403 }
      );
    }
    if (!isEditor && sessionUser.auteurId !== safeAuteurId) {
      return NextResponse.json(
        { error: "Vous ne pouvez créer des articles que pour votre propre profil auteur." },
        { status: 403 }
      );
    }
    if (!draftMode && (!safeTitre || !safeContenuHtml)) {
      return NextResponse.json(
        { error: "Champs requis : titre, contenu, auteurId" },
        { status: 400 }
      );
    }

    const htmlForDebug = sanitizedContenuHtml || "";

    // #region agent log
    ingestDebug({
      sessionId: "a34272",
      runId: "pre-fix",
      hypothesisId: "H_ARTICLE_POST_CONTENT",
      location: "app/api/articles/route.ts:POST:beforeCreate",
      message: "Creating article from DepotPage",
      data: {
        contenuLength: htmlForDebug.length,
        hasImgTag: htmlForDebug.includes("<img"),
        hasSocialPostBlock: htmlForDebug.includes('class="social-post"'),
        hasEmbedBlock: htmlForDebug.includes('class="embed-block"'),
        targetSlug,
      },
    });
    // #endregion

    let targetEtat = await prisma.etat.findFirst({
      where: { slug: targetSlug },
    });
    if (!targetEtat && targetSlug === "brouillon") {
      targetEtat = await prisma.etat.create({
        data: { slug: "brouillon", libelle: "Brouillon", ordre: -1 },
      });
    } else if (!targetEtat && targetSlug === "publie") {
      targetEtat = await prisma.etat.create({
        data: { slug: "publie", libelle: "Publié", ordre: 3 },
      });
    } else if (!targetEtat && targetSlug === "a_relire") {
      targetEtat = await prisma.etat.create({
        data: { slug: "a_relire", libelle: "À relire", ordre: 1 },
      });
    }

    const autoLienPhoto = extractFirstImageSrc(safeContenuHtml);
    const autoLienPhotoFromSanitized = extractFirstImageSrc(sanitizedContenuHtml);

    const article = await prisma.article.create({
      data: {
        titre: safeTitre,
        chapo: chapo?.trim() || null,
        contenu: sanitizedContenuHtml,
        contenuJson: contenuJson ?? null,
        auteurId: safeAuteurId,
        mutuelleId: mutuelleId || null,
        rubriqueId: rubriqueId || null,
        formatId: formatId || null,
        etatId: targetEtat?.id ?? null,
        legendePhoto: legendePhoto?.trim() || null,
        creditPhoto: creditPhoto?.trim() || null,
        postRs: postRs?.trim() || null,
        lienPhoto: (lienPhoto?.trim() || autoLienPhotoFromSanitized || autoLienPhoto) ?? null,
        lienGoogleDoc: lienGoogleDoc?.trim() || null,
        dateDepot: draftMode ? null : new Date(),
      },
      include: {
        auteur: true,
        etat: true,
      },
    });

    // #region agent log
    ingestDebug({
      sessionId: "a34272",
      runId: "pre-fix",
      hypothesisId: "H_ARTICLE_LIENPHOTO",
      location: "app/api/articles/route.ts:POST:afterCreate",
      message: "Article created with lienPhoto",
      data: {
        articleId: article.id,
        hasLienPhoto: !!article.lienPhoto,
        lienPhoto: article.lienPhoto ?? null,
      },
    });
    // #endregion

    const events = buildArticleNotificationEvents({
      articleId: article.id,
      actorUserId: sessionUser.id,
      targetAuteurId: article.auteurId,
      isCreate: true,
      toStatusSlug: article.etat?.slug ?? null,
    });

    for (const event of events) {
      try {
        await dispatchArticleNotificationEvent({ event });
      } catch (error) {
        console.error("dispatchArticleNotificationEvent POST /api/articles", error);
      }
    }

    return NextResponse.json(article);
  } catch (e) {
    console.error("POST /api/articles", e);
    return NextResponse.json({ error: "Erreur lors de la création" }, { status: 500 });
  }
}
