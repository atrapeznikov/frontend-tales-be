-- AlterTable
ALTER TABLE "users" ADD COLUMN     "is_verified" BOOLEAN NOT NULL DEFAULT false;

-- Grandfather existing accounts: they predate email verification, so mark them
-- verified. New sign-ups get the column default (false) and must verify.
UPDATE "users" SET "is_verified" = true;
