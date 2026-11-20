-- Migration de départ (baseline) : schéma tel qu'il existait avant
-- 20260223064727_add_article_blocs, reconstitué depuis schema.prisma.
-- Le fichier 20240221000000_init d'origine est un fichier de remplacement sans SQL :
-- celui-ci permet de recréer une base vierge avec `prisma migrate deploy`.
-- En prod, il est marqué comme appliqué (le schéma existait déjà) : il n'y est jamais rejoué.

-- CreateTable
CREATE TABLE "Mutuelle" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,

    CONSTRAINT "Mutuelle_pkey" PRIMARY KEY ("id")
);


-- CreateTable
CREATE TABLE "Rubrique" (
    "id" TEXT NOT NULL,
    "libelle" TEXT NOT NULL,

    CONSTRAINT "Rubrique_pkey" PRIMARY KEY ("id")
);


-- CreateTable
CREATE TABLE "Format" (
    "id" TEXT NOT NULL,
    "libelle" TEXT NOT NULL,
    "signesReference" INTEGER,

    CONSTRAINT "Format_pkey" PRIMARY KEY ("id")
);


-- CreateTable
CREATE TABLE "Etat" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "libelle" TEXT NOT NULL,
    "ordre" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Etat_pkey" PRIMARY KEY ("id")
);


-- CreateTable
CREATE TABLE "Auteur" (
    "id" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "email" TEXT,
    "mutuelleId" TEXT,

    CONSTRAINT "Auteur_pkey" PRIMARY KEY ("id")
);


-- CreateTable
CREATE TABLE "Article" (
    "id" TEXT NOT NULL,
    "codeArticle" TEXT,
    "titre" TEXT NOT NULL,
    "chapo" TEXT,
    "contenu" TEXT NOT NULL,
    "contenuJson" JSONB,
    "legendePhoto" TEXT,
    "creditPhoto" TEXT,
    "postRs" TEXT,
    "lienPhoto" TEXT,
    "lienGoogleDoc" TEXT,
    "nombreSignes" INTEGER,
    "date_depot" TIMESTAMP(3),
    "date_publication" TIMESTAMP(3),
    "auteurId" TEXT NOT NULL,
    "mutuelleId" TEXT,
    "rubriqueId" TEXT,
    "formatId" TEXT,
    "etatId" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Article_pkey" PRIMARY KEY ("id")
);


-- CreateTable
CREATE TABLE "ArticleHistorique" (
    "id" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "etatId" TEXT,
    "userId" TEXT,
    "commentaire" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArticleHistorique_pkey" PRIMARY KEY ("id")
);


-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT,
    "role" TEXT NOT NULL DEFAULT 'auteur',
    "auteurId" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);


-- CreateIndex
CREATE UNIQUE INDEX "Mutuelle_nom_key" ON "Mutuelle"("nom");


-- CreateIndex
CREATE UNIQUE INDEX "Rubrique_libelle_key" ON "Rubrique"("libelle");


-- CreateIndex
CREATE UNIQUE INDEX "Format_libelle_key" ON "Format"("libelle");


-- CreateIndex
CREATE UNIQUE INDEX "Etat_slug_key" ON "Etat"("slug");


-- CreateIndex
CREATE UNIQUE INDEX "Auteur_prenom_nom_key" ON "Auteur"("prenom", "nom");


-- CreateIndex
CREATE INDEX "Article_date_depot_idx" ON "Article"("date_depot");


-- CreateIndex
CREATE INDEX "Article_etatId_idx" ON "Article"("etatId");


-- CreateIndex
CREATE INDEX "Article_auteurId_idx" ON "Article"("auteurId");


-- CreateIndex
CREATE INDEX "Article_mutuelleId_idx" ON "Article"("mutuelleId");


-- CreateIndex
CREATE INDEX "Article_rubriqueId_idx" ON "Article"("rubriqueId");


-- CreateIndex
CREATE INDEX "Article_formatId_idx" ON "Article"("formatId");


-- CreateIndex
CREATE INDEX "ArticleHistorique_articleId_idx" ON "ArticleHistorique"("articleId");


-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");


-- AddForeignKey
ALTER TABLE "Auteur" ADD CONSTRAINT "Auteur_mutuelleId_fkey" FOREIGN KEY ("mutuelleId") REFERENCES "Mutuelle"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- AddForeignKey
ALTER TABLE "Article" ADD CONSTRAINT "Article_auteurId_fkey" FOREIGN KEY ("auteurId") REFERENCES "Auteur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- AddForeignKey
ALTER TABLE "Article" ADD CONSTRAINT "Article_mutuelleId_fkey" FOREIGN KEY ("mutuelleId") REFERENCES "Mutuelle"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- AddForeignKey
ALTER TABLE "Article" ADD CONSTRAINT "Article_rubriqueId_fkey" FOREIGN KEY ("rubriqueId") REFERENCES "Rubrique"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- AddForeignKey
ALTER TABLE "Article" ADD CONSTRAINT "Article_formatId_fkey" FOREIGN KEY ("formatId") REFERENCES "Format"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- AddForeignKey
ALTER TABLE "Article" ADD CONSTRAINT "Article_etatId_fkey" FOREIGN KEY ("etatId") REFERENCES "Etat"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- AddForeignKey
ALTER TABLE "ArticleHistorique" ADD CONSTRAINT "ArticleHistorique_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- AddForeignKey
ALTER TABLE "ArticleHistorique" ADD CONSTRAINT "ArticleHistorique_etatId_fkey" FOREIGN KEY ("etatId") REFERENCES "Etat"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- AddForeignKey
ALTER TABLE "ArticleHistorique" ADD CONSTRAINT "ArticleHistorique_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_auteurId_fkey" FOREIGN KEY ("auteurId") REFERENCES "Auteur"("id") ON DELETE SET NULL ON UPDATE CASCADE;

