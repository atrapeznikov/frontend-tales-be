-- AlterTable
ALTER TABLE "users" ADD COLUMN "nickname" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "users_nickname_key" ON "users"("nickname");
