import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { getStatusWhereClause } from "@/lib/article-status";
import { ArticlesExplorerView } from "./ArticlesCardsExplorer";
import { ArticlesCardsView } from "./ArticlesCardsView";
import { ArticlesTableView } from "./ArticlesTableView";
import { ArticlesFiltersBar } from "./ArticlesFiltersBar";
import {
  buildArticleTextSearchWhere,
  mergeArticleWhereClauses,
} from "@/lib/article-search-where";

export const dynamic = "force-dynamic";

type SearchParams = {
  q?: string;
  page?: string;
  etat?: string;
  mutuelleId?: string;
  rubriqueId?: string;
  formatId?: string;
  auteurId?: string;
   since?: string;
   from?: string;
   to?: string;
  article?: string;
  view?: string;
  mine?: string;
  back?: string;
};

type PageProps = {
  searchParams?: Promise<SearchParams>;
};

export default async function ArticlesPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const currentUser = await getSessionUser();
  const isAdmin = currentUser?.role === "admin";
  const mineParam = params.mine === "1" ? "1" : "";
  const effectiveEtatSlug = mineParam === "1" ? params.etat || "" : params.etat || "publie";
  const lastArticle = await prisma.article.findFirst({
    where: mineParam === "1" ? undefined : { etat: getStatusWhereClause("publie") },
    orderBy: [
      { dateDepot: "desc" },
      { createdAt: "desc" },
    ],
    select: { dateDepot: true, createdAt: true },
  });

  const q = params.q?.trim() || "";
  const page = Math.max(Number(params.page) || 1, 1);
  const etatSlug = effectiveEtatSlug;
  const mutuelleParam = params.mutuelleId || "";
  const rubriqueParam = params.rubriqueId || "";
  const formatParam = params.formatId || "";
  const auteurParam = params.auteurId || "";
  const sinceParam = params.since || "";
  const fromParam = params.from || "";
  const toParam = params.to || "";
  const selectedArticleId = params.article || "";
  const backParam = params.back || "";
  const sessionUser = mineParam === "1" ? currentUser : null;
  const rawView = params.view;
  const view: "cards" | "explorer" | "table" =
    rawView === "table" || rawView === "cards" || rawView === "explorer"
      ? rawView
      : "explorer";

  const take = 20;
  const skip = (page - 1) * take;

  const where: any = {};

  const textSearchWhere = buildArticleTextSearchWhere(q);

  const etatWhere = getStatusWhereClause(etatSlug);
  if (etatWhere) {
    where.etat = etatWhere;
  }

  if (mineParam === "1") {
    // Mes contenus : filtrer sur l'auteur lié à l'utilisateur connecté.
    if (!sessionUser?.auteurId) {
      // Pas d'auteur associé -> aucun contenu à retourner
      where.auteurId = "__none__";
    } else {
      where.auteurId = sessionUser.auteurId;
    }
  }

  const createdAtFilter: any = {};
  const fromDate = fromParam ? new Date(fromParam) : null;
  const sinceDate = sinceParam ? new Date(sinceParam) : null;
  const toDate = toParam ? new Date(toParam) : null;
  if (fromDate && !Number.isNaN(fromDate.getTime())) {
    createdAtFilter.gte = fromDate;
  } else if (sinceDate && !Number.isNaN(sinceDate.getTime())) {
    createdAtFilter.gte = sinceDate;
  }
  if (toDate && !Number.isNaN(toDate.getTime())) {
    createdAtFilter.lte = toDate;
  }
  if (Object.keys(createdAtFilter).length > 0) {
    where.createdAt = createdAtFilter;
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
  const finalWhere = mergeArticleWhereClauses(where, textSearchWhere);

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
      orderBy: [
        { dateDepot: "desc" },
        { createdAt: "desc" },
      ],
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

  const totalPages = Math.max(Math.ceil(total / take), 1);

  return (
    <main>
      <div className="mx-auto max-w-6xl px-4 pt-8 pb-28 lg:pb-8 space-y-4">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold text-rer-text">
              Liste des contenus
            </h1>
            <p className="mt-1 max-w-xl text-sm text-rer-muted">
              Rechercher, filtrer par état ou par mutuelle, puis ouvrir un contenu
              pour le lire, le corriger ou l&apos;exporter.
            </p>
          </div>
          <Link
            href="/articles/depot"
            className="btn-cta hidden lg:inline-flex"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-white/10 text-base leading-none">
              +
            </span>
            <span>Nouveau contenu</span>
          </Link>
        </header>

        <ArticlesFiltersBar
          total={total}
          lastCreatedAt={
            lastArticle
              ? (lastArticle.dateDepot ?? lastArticle.createdAt)?.toISOString() ??
                null
              : null
          }
        />

        <section
          aria-label="Liste des contenus"
          className="mt-4 space-y-3 max-lg:pb-20"
        >
          {view === "table" ? (
            <ArticlesTableView
              initialArticles={articleSummaries}
              total={total}
              initialPage={page}
              pageSize={take}
              q={q}
              etatSlug={etatSlug}
              mutuelleId={mutuelleParam}
              rubriqueId={rubriqueParam}
              formatId={formatParam}
          mine={mineParam}
              since={sinceParam}
              from={fromParam}
              to={toParam}
              canOpenAdminEdit={isAdmin}
            />
          ) : view === "explorer" ? (
            <ArticlesExplorerView
              articles={articleSummaries}
              total={total}
              initialPage={page}
              pageSize={take}
              q={q}
              etatSlug={etatSlug}
              mutuelleId={mutuelleParam}
              rubriqueId={rubriqueParam}
              formatId={formatParam}
              mine={mineParam}
              back={backParam}
              since={sinceParam}
              from={fromParam}
              to={toParam}
              showEtat={false}
              canOpenAdminEdit={isAdmin}
              initialSelectedId={selectedArticleId || undefined}
            />
          ) : (
            <ArticlesCardsView
              initialArticles={articleSummaries}
              total={total}
              initialPage={page}
              pageSize={take}
              q={q}
              etatSlug={etatSlug}
              mutuelleId={mutuelleParam}
              rubriqueId={rubriqueParam}
              formatId={formatParam}
              mine={mineParam}
              since={sinceParam}
              from={fromParam}
              to={toParam}
              canOpenAdminEdit={isAdmin}
            />
          )}
        </section>

        {/* CTA mobile : icône seule pour éviter le chevauchement avec la liste */}
        <Link
          href="/articles/depot"
          aria-label="Nouveau contenu"
          className="btn-cta fixed bottom-6 right-6 z-30 flex h-14 w-14 items-center justify-center rounded-full p-0 shadow-lg lg:hidden"
        >
          <span className="text-2xl leading-none" aria-hidden="true">
            +
          </span>
        </Link>
      </div>
    </main>
  );
}

