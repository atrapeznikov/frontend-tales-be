-- CreateEnum
CREATE TYPE "ReactionType" AS ENUM ('LIKE', 'FIRE', 'LAUGH', 'DISLIKE');

-- CreateTable
CREATE TABLE "comments" (
    "id" UUID NOT NULL,
    "article_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comment_replies" (
    "id" UUID NOT NULL,
    "comment_id" UUID NOT NULL,
    "parent_id" UUID,
    "user_id" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "comment_replies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comment_reactions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" "ReactionType" NOT NULL,
    "comment_id" UUID,
    "comment_reply_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comment_reactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "comments_article_id_idx" ON "comments"("article_id");

-- CreateIndex
CREATE INDEX "comment_replies_comment_id_parent_id_idx" ON "comment_replies"("comment_id", "parent_id");

-- CreateIndex
CREATE UNIQUE INDEX "comment_reactions_user_id_comment_id_key" ON "comment_reactions"("user_id", "comment_id");

-- CreateIndex
CREATE UNIQUE INDEX "comment_reactions_user_id_comment_reply_id_key" ON "comment_reactions"("user_id", "comment_reply_id");

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comment_replies" ADD CONSTRAINT "comment_replies_comment_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comment_replies" ADD CONSTRAINT "comment_replies_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "comment_replies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comment_replies" ADD CONSTRAINT "comment_replies_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comment_reactions" ADD CONSTRAINT "comment_reactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comment_reactions" ADD CONSTRAINT "comment_reactions_comment_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comment_reactions" ADD CONSTRAINT "comment_reactions_comment_reply_id_fkey" FOREIGN KEY ("comment_reply_id") REFERENCES "comment_replies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
