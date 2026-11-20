-- Suppression de deux fiches auteur en doublon, créées par erreur :
--   « AYves MIRALES »      (doublon de « Yves MIRALES »)
--   « Constance PERIN »    (doublon de « Constance PÉRIN »)
-- Vérifié le 20/11/2026 : aucune n'a d'article ni de compte utilisateur rattaché.
-- Garde-fou : une fiche n'est supprimée que si rien ne la référence encore.
-- Idempotent : sans effet si les fiches ont déjà disparu.

DELETE FROM "Auteur" a
WHERE a."id" IN ('cmlw10vqa0001wwa9ty0g3fsg', 'cmpvcn25f000evovdi4bx8p9o')
  AND NOT EXISTS (SELECT 1 FROM "Article" ar WHERE ar."auteurId" = a."id")
  AND NOT EXISTS (SELECT 1 FROM "User" u WHERE u."auteurId" = a."id");
