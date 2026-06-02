/** Critères de recherche texte sur articles (titre, chapô, contenu, auteur). */
export function buildArticleTextSearchWhere(q: string) {
  const trimmed = q.trim();
  if (!trimmed) return null;

  return {
    OR: [
      { titre: { contains: trimmed, mode: "insensitive" as const } },
      { chapo: { contains: trimmed, mode: "insensitive" as const } },
      { contenu: { contains: trimmed, mode: "insensitive" as const } },
      {
        auteur: {
          OR: [
            { prenom: { contains: trimmed, mode: "insensitive" as const } },
            { nom: { contains: trimmed, mode: "insensitive" as const } },
          ],
        },
      },
    ],
  };
}

/** Fusionne recherche texte et filtre date (chacun peut utiliser OR). */
export function mergeArticleWhereClauses(
  base: Record<string, unknown>,
  textSearch: ReturnType<typeof buildArticleTextSearchWhere>,
  dateOrClause?: unknown
) {
  const andParts: unknown[] = [];

  const { OR: _ignored, ...rest } = base;
  if (Object.keys(rest).length > 0) {
    andParts.push(rest);
  }

  if (textSearch) {
    andParts.push(textSearch);
  }

  if (dateOrClause) {
    andParts.push({ OR: dateOrClause });
  }

  if (andParts.length === 0) return {};
  if (andParts.length === 1) return andParts[0] as Record<string, unknown>;
  return { AND: andParts };
}
