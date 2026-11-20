-- Contrainte manquante en prod : User.auteurId -> Auteur.id (déclarée dans
-- schema.prisma, créée par la migration de départ sur une base vierge).
-- 1) Les comptes qui pointent vers une fiche auteur inexistante sont détachés
--    (constaté le 20/11/2026 : admin@rer.local et relecteur@rer.local).
-- 2) La contrainte est ajoutée seulement si elle n'existe pas déjà.
-- Idempotent.

UPDATE "User" u
SET "auteurId" = NULL
WHERE u."auteurId" IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "Auteur" a WHERE a."id" = u."auteurId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'User_auteurId_fkey') THEN
    ALTER TABLE "User"
      ADD CONSTRAINT "User_auteurId_fkey" FOREIGN KEY ("auteurId")
      REFERENCES "Auteur"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
