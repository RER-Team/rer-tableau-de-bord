import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ARTICLE_STATUS_OPTIONS, getStatusWhereClause } from "@/lib/article-status";
import { AdminReviewExplorer } from "../AdminReviewExplorer";

export const dynamic = "force-dynamic";

type SearchParams = {
  q?: string;
  page?: string;
  etat?: string;
  mutuelleId?: string;
  rubriqueId?: string;
  formatId?: string;
  since?: string;
  from?: string;
  to?: string;
  article?: string;
};

type PageProps = {
  searchParams?: Promise<SearchParams>;
};

export default async function AdminArticlesQueuePage({
  searchParams,
}: PageProps) {
  const params = (await searchParams) ?? {};
  const q = params.q?.trim() || "";
  const page = Math.max(Number(params.page) || 1, 1);
  const etatSlug = params.etat ?? "a_relire";
  const mutuelleParam = params.mutuelleId || "";
  const rubriqueParam = params.rubriqueId || "";
  const formatParam = params.formatId || "";
  const sinceParam = params.since || "";
  const fromParam = params.from || "";
  const toParam = params.to || "";
  const selectedArticleId = params.article || "";

  const take = 20;
  const skip = (page - 1) * take;

  const where: any = {};

  if (q) {
    where.OR = [
      { titre: { contains: q, mode: "insensitive" } },
      { chapo: { contains: q, mode: "insensitive" } },
      { contenu: { contains: q, mode: "insensitive" } },
    ];
  }

  const etatWhere = getStatusWhereClause(etatSlug);
  if (etatWhere) {
    where.etat = etatWhere;
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

  const [articles, total] = await Promise.all([
    prisma.article.findMany({
      where,
      include: {
        auteur: true,
        mutuelle: true,
        rubrique: true,
        format: true,
        etat: true,
      },
      orderBy: [
        { dateDepot: "desc" },
        { createdAt: "desc" },
      ],
      skip,
      take,
    }),
    prisma.article.count({ where }),
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
    <section aria-label="File de contenus à relire" className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-rer-text">
            Relecture et correction
          </h1>
          <p className="mt-1 max-w-xl text-sm text-rer-muted">
            Accédez à la file de relecture, changez les états et ouvrez un contenu pour le corriger.
          </p>
        </div>
        <Link href="/articles/depot" className="btn-cta hidden lg:inline-flex">
          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-white/10 text-base leading-none">
            +
          </span>
          <span>Nouveau contenu</span>
        </Link>
      </div>

      <AdminReviewExplorer
        articles={articleSummaries}
        total={total}
        initialPage={page}
        pageSize={take}
        q={q}
        etatSlug={etatSlug}
        mutuelleId={mutuelleParam}
        rubriqueId={rubriqueParam}
        formatId={formatParam}
        since={sinceParam}
        from={fromParam}
        to={toParam}
        initialSelectedId={selectedArticleId || undefined}
        etats={ARTICLE_STATUS_OPTIONS}
      />
    </section>
  );
}

