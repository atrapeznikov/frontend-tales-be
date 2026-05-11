-- CreateTable
CREATE TABLE "roadmap_section_translations" (
    "id" UUID NOT NULL,
    "section_id" UUID NOT NULL,
    "language" VARCHAR(2) NOT NULL,
    "title" TEXT NOT NULL,

    CONSTRAINT "roadmap_section_translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roadmap_category_translations" (
    "id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "language" VARCHAR(2) NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "roadmap_category_translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roadmap_item_translations" (
    "id" UUID NOT NULL,
    "item_id" UUID NOT NULL,
    "language" VARCHAR(2) NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "roadmap_item_translations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "roadmap_section_translations_language_idx" ON "roadmap_section_translations"("language");

-- CreateIndex
CREATE UNIQUE INDEX "roadmap_section_translations_section_id_language_key" ON "roadmap_section_translations"("section_id", "language");

-- CreateIndex
CREATE INDEX "roadmap_category_translations_language_idx" ON "roadmap_category_translations"("language");

-- CreateIndex
CREATE UNIQUE INDEX "roadmap_category_translations_category_id_language_key" ON "roadmap_category_translations"("category_id", "language");

-- CreateIndex
CREATE INDEX "roadmap_item_translations_language_idx" ON "roadmap_item_translations"("language");

-- CreateIndex
CREATE UNIQUE INDEX "roadmap_item_translations_item_id_language_key" ON "roadmap_item_translations"("item_id", "language");

-- AddForeignKey
ALTER TABLE "roadmap_section_translations" ADD CONSTRAINT "roadmap_section_translations_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "roadmap_sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roadmap_category_translations" ADD CONSTRAINT "roadmap_category_translations_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "roadmap_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roadmap_item_translations" ADD CONSTRAINT "roadmap_item_translations_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "roadmap_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

