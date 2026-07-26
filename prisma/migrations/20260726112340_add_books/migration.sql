-- CreateEnum
CREATE TYPE "BookLanguage" AS ENUM ('RU', 'EN');

-- CreateEnum
CREATE TYPE "BookStatus" AS ENUM ('RECOMMENDED', 'NOT_RECOMMENDED');

-- CreateTable
CREATE TABLE "books" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "description" TEXT,
    "cover_url" TEXT,
    "language" "BookLanguage" NOT NULL,
    "status" "BookStatus" NOT NULL DEFAULT 'RECOMMENDED',
    "rating" INTEGER,
    "review_text" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "purchase_links" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "books_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "books_language_status_idx" ON "books"("language", "status");
