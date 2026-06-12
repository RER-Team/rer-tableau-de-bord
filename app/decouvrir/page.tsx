import Link from "next/link";
import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { getStatusWhereClause } from "@/lib/article-status";
import { ArticlesExplorerView } from "@/app/articles/ArticlesCardsExplorer";
import { ArticlesCardsView } from "@/app/articles/ArticlesCardsView";
import { ArticlesTableView } from "@/app/articles/ArticlesTableView";
import { ArticlesFiltersBar } from "@/app/articles/ArticlesFiltersBar";
import {
  buildArticleTextSearchWhere,
  mergeArticleWhereClauses,
} from "@/lib/article-search-where";

export const dynamic = "force-dynamic";

type SearchParams = {
  q?: string;
  page?: string;
  mutuelleId?: string;
  rubriqueId?: string;
  formatId?: string;
  auteurId?: string;
  since?: string;
  from?: string;
  to?: string;
  article?: string;
  view?: string;
};

type PageProps = {
  searchParams?: Promise<SearchParams>;
};

export default async function DecouvrirPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};

  const lastArticle = await prisma.article.findFirst({
    where: { etat: getStatusWhereClause("publie"), isExemplePublic: true },
    orderBy: [{ dateDepot: "desc" }, { createdAt: "desc" }],
    select: { dateDepot: true, createdAt: true },
  });

  const q = params.q?.trim() || "";
  const page = Math.max(Number(params.page) || 1, 1);
  const mutuelleParam = params.mutuelleId || "";
  const rubriqueParam = params.rubriqueId || "";
  const formatParam = params.formatId || "";
  const auteurParam = params.auteurId || "";
  const sinceParam = params.since || "";
  const fromParam = params.from || "";
  const toParam = params.to || "";
  const selectedArticleId = params.article || "";
  const rawView = params.view;
  const view: "cards" | "explorer" | "table" =
    rawView === "table" || rawView === "cards" || rawView === "explorer"
      ? rawView
      : "explorer";

  const take = 20;
  const skip = (page - 1) * take;

  const where: Record<string, unknown> = {
    etat: getStatusWhereClause("publie"),
    isExemplePublic: true,
  };

  const textSearchWhere = buildArticleTextSearchWhere(q);

  const dateFilter: Record<string, Date> = {};
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
  const dateOrClause: Record<string, unknown>[] = [];
  if (Object.keys(dateFilter).length > 0) {
    dateOrClause.push(
      {
        AND: [
          { datePublication: { not: null } },
          { datePublication: dateFilter },
        ],
      },
      {
        AND: [{ datePublication: null }, { createdAt: dateFilter }],
      }
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

  const auteurIds = auteurParam
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
  if (auteurIds.length === 1) {
    where.auteurId = auteurIds[0];
  } else if (auteurIds.length > 1) {
    where.auteurId = { in: auteurIds };
  }

  const finalWhere = mergeArticleWhereClauses(
    where,
    textSearchWhere,
    dateOrClause.length ? dateOrClause : undefined
  );

  const [articles, total] = await Promise.all([
    prisma.article.findMany({
      where: finalWhere,
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
      orderBy: [{ dateDepot: "desc" }, { createdAt: "desc" }],
      skip,
      take,
    }),
    prisma.article.count({ where: finalWhere }),
  ]);

  const articleSummaries = articles.map((article) => ({
    ...article,
    dateDepot: article.dateDepot ? article.dateDepot.toISOString() : null,
    datePublication: article.datePublication
      ? article.datePublication.toISOString()
      : null,
    createdAt: article.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-4 pb-8">
      <header>
        <h2 className="text-xl font-extrabold text-rer-text">
          Parcourir les contenus publiés
        </h2>
        <p className="mt-1 max-w-2xl text-sm text-rer-muted">
          Recherchez, filtrez par mutuelle, rubrique ou format, puis lisez et
          exportez un contenu comme sur la banque complète du réseau.
        </p>
      </header>

      <Suspense
        fallback={
          <div className="h-24 animate-pulse rounded-xl bg-white ring-1 ring-rer-border" />
        }
      >
        <ArticlesFiltersBar
          total={total}
          lastCreatedAt={
            lastArticle
              ? (lastArticle.dateDepot ?? lastArticle.createdAt)?.toISOString() ??
                null
              : null
          }
        />
      </Suspense>

      <section aria-label="Contenus publiés" className="mt-4 space-y-3">
        {view === "table" ? (
          <ArticlesTableView
            initialArticles={articleSummaries}
            total={total}
            initialPage={page}
            pageSize={take}
            q={q}
            etatSlug="publie"
            mutuelleId={mutuelleParam}
            rubriqueId={rubriqueParam}
            formatId={formatParam}
            since={sinceParam}
            from={fromParam}
            to={toParam}
            publicMode
          />
        ) : view === "explorer" ? (
          <ArticlesExplorerView
            articles={articleSummaries}
            total={total}
            initialPage={page}
            pageSize={take}
            q={q}
            etatSlug="publie"
            mutuelleId={mutuelleParam}
            rubriqueId={rubriqueParam}
            formatId={formatParam}
            since={sinceParam}
            from={fromParam}
            to={toParam}
            showEtat={false}
            initialSelectedId={selectedArticleId || undefined}
            publicMode
          />
        ) : (
          <ArticlesCardsView
            initialArticles={articleSummaries}
            total={total}
            initialPage={page}
            pageSize={take}
            q={q}
            etatSlug="publie"
            mutuelleId={mutuelleParam}
            rubriqueId={rubriqueParam}
            formatId={formatParam}
            since={sinceParam}
            from={fromParam}
            to={toParam}
            publicMode
          />
        )}
      </section>

      <p className="pt-4 text-center text-xs text-rer-muted">
        Vous êtes membre du réseau ?{" "}
        <Link href="/login" className="text-rer-blue underline">
          Connectez-vous
        </Link>{" "}
        pour déposer vos contenus et accéder à l&apos;espace complet.
      </p>
    </div>
  );
}
