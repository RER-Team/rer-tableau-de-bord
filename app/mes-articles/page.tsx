import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import {
  ARTICLE_STATUS_OPTIONS,
  getArticleStatusLabel,
  getStatusWhereClause,
  isPublishedStatus,
  normalizeArticleStatusSlug,
} from "@/lib/article-status";
import { redirect } from "next/navigation";
import { MesArticlesFiltersBar } from "./MesArticlesFiltersBar";
import { MesArticlesTable } from "./MesArticlesTable";

export const dynamic = "force-dynamic";

type SearchParams = {
  page?: string;
  etat?: string;
  mutuelleId?: string;
  sort?: string;
};

type PageProps = {
  searchParams?: Promise<SearchParams>;
};

function buildLastActionLabel(options: {
  etatSlug: string | null;
  etatLibelle: string | null;
  lastHistoriqueAt: Date | null;
  lastHistoriqueUserEmail: string | null;
  dateDepot: Date | null;
  createdAt: Date;
}): { label: string; at: Date | null } {
  const { etatSlug, etatLibelle, lastHistoriqueAt, lastHistoriqueUserEmail, dateDepot, createdAt } =
    options;

  const baseDate = lastHistoriqueAt ?? dateDepot ?? createdAt ?? null;

  if (!etatSlug) {
    return {
      label: "Créé",
      at: baseDate,
    };
  }

  if (etatSlug === "a_relire") {
    return {
      label: "Soumis à relecture",
      at: baseDate,
    };
  }

  if (etatSlug === "publie") {
    return {
      label: lastHistoriqueUserEmail
        ? `Publié par ${lastHistoriqueUserEmail}`
        : "Publié",
      at: baseDate,
    };
  }

  return {
    label: etatLibelle ?? "Mise à jour",
    at: baseDate,
  };
}

export default async function MesArticlesPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    redirect("/login");
  }

  const auteurId = sessionUser.auteurId;

  const rawPage = params.page;
  const page = Math.max(Number(rawPage) || 1, 1);
  const etatSlug = params.etat ?? "";
  const mutuelleIdParam = params.mutuelleId ?? "";
  const sort = params.sort ?? "lastModifiedDesc";

  const take = 20;
  const skip = (page - 1) * take;

  const where: any = {};

  if (auteurId) {
    where.auteurId = auteurId;
  } else {
    // Aucun auteur associé : on force un filtre impossible pour retourner 0 résultat.
    where.auteurId = "__none__";
  }

  const etatWhere = getStatusWhereClause(etatSlug);
  if (etatWhere) {
    where.etat = etatWhere;
  }

  if (mutuelleIdParam) {
    where.mutuelleId = mutuelleIdParam;
  }

  const orderBy =
    sort === "dateDepotAsc"
      ? { dateDepot: "asc" }
      : sort === "dateDepotDesc"
      ? { dateDepot: "desc" }
      : sort === "etat"
      ? { etat: { ordre: "asc" } }
      : sort === "lastModifiedAsc"
      ? { updatedAt: "asc" }
      : { updatedAt: "desc" };

  const [articles, total, etats, groupedByEtat] = await Promise.all([
    prisma.article.findMany({
      where,
      orderBy: orderBy as any,
      skip,
      take,
      include: {
        etat: true,
        mutuelle: true,
        rubrique: true,
        format: true,
        historiques: {
          orderBy: { createdAt: "desc" },
          take: 1,
          include: { etat: true, user: true },
        },
      },
    }),
    prisma.article.count({ where }),
    prisma.etat.findMany({ orderBy: { ordre: "asc" } }),
    prisma.article.groupBy({
      by: ["etatId"],
      _count: { _all: true },
      where,
    }),
  ]);

  const totalPages = Math.max(Math.ceil(total / take), 1);

  const etatById = new Map(etats.map((etat) => [etat.id, etat]));

  const statusCountsBySlug: Record<string, number> = {};
  for (const group of groupedByEtat) {
    const etat = group.etatId ? etatById.get(group.etatId) : null;
    const normalizedSlug = normalizeArticleStatusSlug(etat?.slug);
    if (!normalizedSlug) continue;
    statusCountsBySlug[normalizedSlug] =
      (statusCountsBySlug[normalizedSlug] ?? 0) + group._count._all;
  }

  const statusParts: string[] = [];
  const pushStatus = (slug: string, label: string) => {
    const value = statusCountsBySlug[slug] ?? 0;
    if (value > 0) {
      statusParts.push(`${value} ${label}`);
    }
  };

  pushStatus("brouillon", "brouillon(s)");
  pushStatus("a_relire", "soumis à relecture");
  pushStatus("publie", "publiés");

  const statusSummary =
    statusParts.length > 0
      ? statusParts.join(" · ")
      : "Aucun contenu pour le moment";

  const rows = articles.map((article) => {
    const lastHistorique = article.historiques[0] ?? null;
    const etatSlugForRow = normalizeArticleStatusSlug(article.etat?.slug ?? null);
    const { label: lastActionLabel, at: lastActionAt } = buildLastActionLabel({
      etatSlug: etatSlugForRow,
      etatLibelle: getArticleStatusLabel(article.etat?.slug, "author"),
      lastHistoriqueAt: lastHistorique ? lastHistorique.createdAt : null,
      lastHistoriqueUserEmail: lastHistorique?.user?.email ?? null,
      dateDepot: article.dateDepot ?? null,
      createdAt: article.createdAt,
    });

    const canEdit = !isPublishedStatus(etatSlugForRow);

    return {
      id: article.id,
      titre: article.titre,
      chapo: article.chapo ?? null,
      lienPhoto: article.lienPhoto ?? null,
      rubrique: article.rubrique?.libelle ?? null,
      format: article.format?.libelle ?? null,
      mutuelle: article.mutuelle?.nom ?? null,
      etatLibelle: getArticleStatusLabel(article.etat?.slug, "author"),
      etatSlug: etatSlugForRow,
      lastAction: lastActionLabel,
      lastActionAt: lastActionAt ? lastActionAt.toISOString() : null,
      updatedAt: article.updatedAt.toISOString(),
      canEdit,
    };
  });

  return (
    <main>
      <div className="mx-auto max-w-6xl px-4 py-8 space-y-4">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold text-rer-text">Mes contenus</h1>
            <p className="mt-1 max-w-xl text-sm text-rer-muted">{statusSummary}</p>
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

        <MesArticlesFiltersBar
          total={total}
          etats={ARTICLE_STATUS_OPTIONS.map((etat) => ({
            id: etat.slug,
            slug: etat.slug,
            libelle: getArticleStatusLabel(etat.slug, "author") ?? etat.libelle,
          }))}
          currentEtatSlug={etatSlug}
          currentSort={sort}
        />

        <section aria-label="Mes contenus" className="mt-2">
          <MesArticlesTable
            articles={rows}
            total={total}
            pageSize={take}
            currentPage={page}
            totalPages={totalPages}
          />
        </section>
      </div>
    </main>
  );
}

