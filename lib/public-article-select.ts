/** Champs exposés sur la vitrine publique /decouvrir (sans données sensibles). */
export const publicArticleListSelect = {
  id: true,
  titre: true,
  chapo: true,
  lienPhoto: true,
  legendePhoto: true,
  creditPhoto: true,
  datePublication: true,
  createdAt: true,
  rubrique: { select: { id: true, libelle: true } },
  format: { select: { id: true, libelle: true } },
  mutuelle: { select: { id: true, nom: true } },
} as const;

export const publicArticleDetailSelect = {
  ...publicArticleListSelect,
  contenu: true,
} as const;
