-- CreateTable
CREATE TABLE "article_translations" (
    "id" UUID NOT NULL,
    "article_id" UUID NOT NULL,
    "language" VARCHAR(2) NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "content" TEXT NOT NULL,

    CONSTRAINT "article_translations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "article_translations_language_idx" ON "article_translations"("language");

-- CreateIndex
CREATE UNIQUE INDEX "article_translations_article_id_language_key" ON "article_translations"("article_id", "language");

-- AddForeignKey
ALTER TABLE "article_translations" ADD CONSTRAINT "article_translations_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Migrate existing data to translations (default to 'ru')
INSERT INTO "article_translations" ("id", "article_id", "language", "title", "description", "content")
SELECT gen_random_uuid(), "id", 'ru', "title", "description", "content"
FROM "articles"
WHERE "title" IS NOT NULL;

-- AlterTable: drop old columns
ALTER TABLE "articles" DROP COLUMN "content",
DROP COLUMN "description",
DROP COLUMN "title";
