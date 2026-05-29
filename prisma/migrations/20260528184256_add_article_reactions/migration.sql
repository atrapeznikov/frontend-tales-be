-- CreateEnum
CREATE TYPE "ArticleReactionType" AS ENUM ('LIKE', 'UNICORN', 'EXPLODING_HEAD', 'RAISED_HANDS', 'FIRE');

-- CreateTable
CREATE TABLE "article_reactions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "article_id" UUID NOT NULL,
    "type" "ArticleReactionType" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "article_reactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "article_reactions_article_id_idx" ON "article_reactions"("article_id");

-- CreateIndex
CREATE UNIQUE INDEX "article_reactions_user_id_article_id_type_key" ON "article_reactions"("user_id", "article_id", "type");

-- AddForeignKey
ALTER TABLE "article_reactions" ADD CONSTRAINT "article_reactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "article_reactions" ADD CONSTRAINT "article_reactions_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
