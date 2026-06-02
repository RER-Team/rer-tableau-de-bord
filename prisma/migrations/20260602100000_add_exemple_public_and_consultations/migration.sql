-- AlterTable
ALTER TABLE "Article" ADD COLUMN "is_exemple_public" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Article_is_exemple_public_idx" ON "Article"("is_exemple_public");

-- CreateTable
CREATE TABLE "ArticleConsultation" (
    "id" TEXT NOT NULL,
    "article_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArticleConsultation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ArticleConsultation_article_id_created_at_idx" ON "ArticleConsultation"("article_id", "created_at");

-- CreateIndex
CREATE INDEX "ArticleConsultation_article_id_user_id_created_at_idx" ON "ArticleConsultation"("article_id", "user_id", "created_at");

-- AddForeignKey
ALTER TABLE "ArticleConsultation" ADD CONSTRAINT "ArticleConsultation_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArticleConsultation" ADD CONSTRAINT "ArticleConsultation_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
