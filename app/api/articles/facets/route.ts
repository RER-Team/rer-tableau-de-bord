import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStatusWhereClause } from "@/lib/article-status";
import {
  buildArticleTextSearchWhere,
  mergeArticleWhereClauses,
} from "@/lib/article-search-where";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim();
  const mutuelleParam = searchParams.get("mutuelleId") ?? "";
  const rubriqueParam = searchParams.get("rubriqueId") ?? "";
  const formatParam = searchParams.get("formatId") ?? "";
  const auteurParam = searchParams.get("auteurId") ?? "";
  const sinceParam = searchParams.get("since") ?? "";
  const fromParam = searchParams.get("from") ?? "";
  const toParam = searchParams.get("to") ?? "";

  // Cet endpoint alimente la barre de filtres du site public : les comptes ne
  // doivent porter que sur les articles publiés (jamais brouillons / à relire).
  const baseWhere: any = { etat: getStatusWhereClause("publie") };
  const textSearchWhere = buildArticleTextSearchWhere(q);

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

  const mutuelleIdsFilter = mutuelleParam
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
  const mutuelleFilter =
    mutuelleIdsFilter.length === 1
      ? mutuelleIdsFilter[0]
      : mutuelleIdsFilter.length > 1
      ? { in: mutuelleIdsFilter }
      : undefined;

  const rubriqueIdsFilter = rubriqueParam
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
  const rubriqueFilter =
    rubriqueIdsFilter.length === 1
      ? rubriqueIdsFilter[0]
      : rubriqueIdsFilter.length > 1
      ? { in: rubriqueIdsFilter }
      : undefined;

  const formatIdsFilter = formatParam
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
  const formatFilter =
    formatIdsFilter.length === 1
      ? formatIdsFilter[0]
      : formatIdsFilter.length > 1
      ? { in: formatIdsFilter }
      : undefined;
  const auteurIdsFilter = auteurParam
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
  const auteurFilter =
    auteurIdsFilter.length === 1
      ? auteurIdsFilter[0]
      : auteurIdsFilter.length > 1
      ? { in: auteurIdsFilter }
      : undefined;

  const fullWhereBase: any = { ...baseWhere };
  if (mutuelleFilter !== undefined) {
    fullWhereBase.mutuelleId = mutuelleFilter;
  }
  if (rubriqueFilter !== undefined) {
    fullWhereBase.rubriqueId = rubriqueFilter;
  }
  if (formatFilter !== undefined) {
    fullWhereBase.formatId = formatFilter;
  }
  if (auteurFilter !== undefined) {
    fullWhereBase.auteurId = auteurFilter;
  }
  const fullWhere = mergeArticleWhereClauses(
    fullWhereBase,
    textSearchWhere,
    dateOrClause.length ? dateOrClause : undefined
  );

  const mutuelleWhereBase: any = { ...baseWhere };
  if (rubriqueFilter !== undefined) {
    mutuelleWhereBase.rubriqueId = rubriqueFilter;
  }
  if (formatFilter !== undefined) {
    mutuelleWhereBase.formatId = formatFilter;
  }
  if (auteurFilter !== undefined) {
    mutuelleWhereBase.auteurId = auteurFilter;
  }
  const mutuelleWhere = mergeArticleWhereClauses(
    mutuelleWhereBase,
    textSearchWhere,
    dateOrClause.length ? dateOrClause : undefined
  );

  const rubriqueWhereBase: any = { ...baseWhere };
  if (mutuelleFilter !== undefined) {
    rubriqueWhereBase.mutuelleId = mutuelleFilter;
  }
  if (formatFilter !== undefined) {
    rubriqueWhereBase.formatId = formatFilter;
  }
  if (auteurFilter !== undefined) {
    rubriqueWhereBase.auteurId = auteurFilter;
  }
  const rubriqueWhere = mergeArticleWhereClauses(
    rubriqueWhereBase,
    textSearchWhere,
    dateOrClause.length ? dateOrClause : undefined
  );

  const formatWhereBase: any = { ...baseWhere };
  if (mutuelleFilter !== undefined) {
    formatWhereBase.mutuelleId = mutuelleFilter;
  }
  if (rubriqueFilter !== undefined) {
    formatWhereBase.rubriqueId = rubriqueFilter;
  }
  if (auteurFilter !== undefined) {
    formatWhereBase.auteurId = auteurFilter;
  }
  const formatWhere = mergeArticleWhereClauses(
    formatWhereBase,
    textSearchWhere,
    dateOrClause.length ? dateOrClause : undefined
  );

  const auteurWhereBase: any = { ...baseWhere };
  if (mutuelleFilter !== undefined) auteurWhereBase.mutuelleId = mutuelleFilter;
  if (rubriqueFilter !== undefined) auteurWhereBase.rubriqueId = rubriqueFilter;
  if (formatFilter !== undefined) auteurWhereBase.formatId = formatFilter;
  const auteurWhere = mergeArticleWhereClauses(
    auteurWhereBase,
    textSearchWhere,
    dateOrClause.length ? dateOrClause : undefined
  );

  const [total, mutuelleGroups, rubriqueGroups, formatGroups, auteurGroups] = await Promise.all([
    prisma.article.count({ where: fullWhere }),
    prisma.article.groupBy({
      by: ["mutuelleId"],
      where: mutuelleWhere,
      _count: { _all: true },
    }),
    prisma.article.groupBy({
      by: ["rubriqueId"],
      where: rubriqueWhere,
      _count: { _all: true },
    }),
    prisma.article.groupBy({
      by: ["formatId"],
      where: formatWhere,
      _count: { _all: true },
    }),
    prisma.article.groupBy({
      by: ["auteurId"],
      where: auteurWhere,
      _count: { _all: true },
    }),
  ]);

  const mutuelleIds = mutuelleGroups
    .map((g) => g.mutuelleId)
    .filter((id): id is string => Boolean(id));
  const rubriqueIds = rubriqueGroups
    .map((g) => g.rubriqueId)
    .filter((id): id is string => Boolean(id));
  const formatIds = formatGroups
    .map((g) => g.formatId)
    .filter((id): id is string => Boolean(id));
  const auteurIds = auteurGroups
    .map((g) => g.auteurId)
    .filter((id): id is string => Boolean(id));

  const [mutuelles, rubriques, formats, auteurs] = await Promise.all([
    mutuelleIds.length
      ? prisma.mutuelle.findMany({
          where: { id: { in: mutuelleIds } },
        })
      : Promise.resolve([]),
    rubriqueIds.length
      ? prisma.rubrique.findMany({
          where: { id: { in: rubriqueIds } },
        })
      : Promise.resolve([]),
    formatIds.length
      ? prisma.format.findMany({
          where: { id: { in: formatIds } },
        })
      : Promise.resolve([]),
    auteurIds.length
      ? prisma.auteur.findMany({
          where: { id: { in: auteurIds } },
          select: { id: true, prenom: true, nom: true },
        })
      : Promise.resolve([]),
  ]);

  const mutuelleFacets = mutuelleGroups
    .filter((g) => g.mutuelleId)
    .map((g) => {
      const m = mutuelles.find((m) => m.id === g.mutuelleId);
      return {
        id: g.mutuelleId as string,
        nom: m?.nom ?? "Inconnue",
        count: g._count._all,
      };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const rubriqueFacets = rubriqueGroups
    .filter((g) => g.rubriqueId)
    .map((g) => {
      const r = rubriques.find((r) => r.id === g.rubriqueId);
      return {
        id: g.rubriqueId as string,
        libelle: r?.libelle ?? "Inconnue",
        count: g._count._all,
      };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const formatFacets = formatGroups
    .filter((g) => g.formatId)
    .map((g) => {
      const f = formats.find((f) => f.id === g.formatId);
      return {
        id: g.formatId as string,
        libelle: f?.libelle ?? "Inconnu",
        count: g._count._all,
      };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
  const auteurFacets = auteurGroups
    .filter((g) => g.auteurId)
    .map((g) => {
      const a = auteurs.find((a) => a.id === g.auteurId);
      return {
        id: g.auteurId as string,
        prenom: a?.prenom ?? "",
        nom: a?.nom ?? "Inconnu",
        count: g._count._all,
      };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 12);

  return NextResponse.json(
    {
      total,
      mutuelles: mutuelleFacets,
      rubriques: rubriqueFacets,
      formats: formatFacets,
      auteurs: auteurFacets,
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
      },
    }
  );
}

