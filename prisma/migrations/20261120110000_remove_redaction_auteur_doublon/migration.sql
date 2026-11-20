-- Suppression de la fiche auteur « Rédaction Rédaction » (cmlw11gw300bbwwa9a3324xzh),
-- doublon de la fiche « Rédaction RÉDACTION » du RER (cmlw10wg3000xwwa9xo1i6gsw).
-- Décisions validées le 20/11/2026 :
--   - l'article de test « test pierre 16h11 » est supprimé (historique, blocs et
--     consultations partent en cascade) ;
--   - « La méditation à la portée de tous » est rattaché à la fiche RER ;
--   - le compte de test auteur@rer.local est détaché (plus de fiche auteur).
-- Idempotent : chaque instruction est sans effet si elle a déjà été appliquée.

DELETE FROM "Article"
WHERE "id" = 'cmpvcnsxj00bmvovdx611g8vv'
  AND "auteurId" = 'cmlw11gw300bbwwa9a3324xzh';

UPDATE "Article"
SET "auteurId" = 'cmlw10wg3000xwwa9xo1i6gsw'
WHERE "auteurId" = 'cmlw11gw300bbwwa9a3324xzh'
  AND EXISTS (SELECT 1 FROM "Auteur" WHERE "id" = 'cmlw10wg3000xwwa9xo1i6gsw');

UPDATE "User"
SET "auteurId" = NULL
WHERE "auteurId" = 'cmlw11gw300bbwwa9a3324xzh';

DELETE FROM "Auteur" a
WHERE a."id" = 'cmlw11gw300bbwwa9a3324xzh'
  AND NOT EXISTS (SELECT 1 FROM "Article" ar WHERE ar."auteurId" = a."id")
  AND NOT EXISTS (SELECT 1 FROM "User" u WHERE u."auteurId" = a."id");
