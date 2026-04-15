export type CanonicalArticleStatusSlug =
  | "brouillon"
  | "a_relire"
  | "publie";
export type KnownArticleStatusSlug =
  | CanonicalArticleStatusSlug
  | "corrige"
  | "valide";
export type ArticleStatusContext = "default" | "author" | "admin" | "public";

export type ArticleStatusOption = {
  slug: CanonicalArticleStatusSlug;
  libelle: string;
  ordre: number;
};

export const ARTICLE_STATUS_OPTIONS: ArticleStatusOption[] = [
  { slug: "brouillon", libelle: "Brouillon", ordre: -1 },
  { slug: "a_relire", libelle: "À relire", ordre: 1 },
  { slug: "publie", libelle: "Publié", ordre: 2 },
];

export function normalizeArticleStatusSlug(
  slug?: string | null
): CanonicalArticleStatusSlug | null {
  switch (slug) {
    case "brouillon":
      return "brouillon";
    case "a_relire":
    case "corrige":
      return "a_relire";
    case "publie":
    case "valide":
      return "publie";
    default:
      return null;
  }
}

export function getArticleStatusLabel(
  slug?: string | null,
  context: ArticleStatusContext = "default"
): string | null {
  const normalizedSlug = normalizeArticleStatusSlug(slug);
  if (!normalizedSlug) return null;

  if (normalizedSlug === "brouillon") {
    return "Brouillon";
  }

  if (normalizedSlug === "a_relire") {
    if (context === "author") {
      return "Soumis à relecture";
    }
    return "À relire";
  }

  return "Publié";
}

export function getStatusFilterSlugs(
  slug?: string | null
): KnownArticleStatusSlug[] {
  const normalizedSlug = normalizeArticleStatusSlug(slug);
  switch (normalizedSlug) {
    case "brouillon":
      return ["brouillon"];
    case "a_relire":
      return ["a_relire", "corrige"];
    case "publie":
      return ["publie", "valide"];
    default:
      return [];
  }
}

export function getStatusWhereClause(slug?: string | null) {
  const slugs = getStatusFilterSlugs(slug);
  if (slugs.length === 0) return undefined;
  if (slugs.length === 1) {
    return { slug: slugs[0] };
  }
  return { slug: { in: slugs } };
}

export function isDraftStatus(slug?: string | null): boolean {
  return normalizeArticleStatusSlug(slug) === "brouillon";
}

export function isReviewStatus(slug?: string | null): boolean {
  return normalizeArticleStatusSlug(slug) === "a_relire";
}

export function isPublishedStatus(slug?: string | null): boolean {
  return normalizeArticleStatusSlug(slug) === "publie";
}
