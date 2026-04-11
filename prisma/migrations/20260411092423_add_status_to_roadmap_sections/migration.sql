-- DropIndex
DROP INDEX "roadmap_sections_sort_order_idx";

-- AlterTable
ALTER TABLE "roadmap_sections" ADD COLUMN     "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT';

-- CreateIndex
CREATE INDEX "roadmap_sections_status_sort_order_idx" ON "roadmap_sections"("status", "sort_order");
