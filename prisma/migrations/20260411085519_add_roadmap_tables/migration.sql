-- CreateTable
CREATE TABLE "roadmap_sections" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "is_new" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roadmap_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roadmap_categories" (
    "id" UUID NOT NULL,
    "section_id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "roadmap_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roadmap_items" (
    "id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "icon_url" TEXT NOT NULL,
    "icon_alt" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "roadmap_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roadmap_links" (
    "id" UUID NOT NULL,
    "item_id" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "type" VARCHAR(10),
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "roadmap_links_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "roadmap_sections_key_key" ON "roadmap_sections"("key");

-- CreateIndex
CREATE INDEX "roadmap_sections_sort_order_idx" ON "roadmap_sections"("sort_order");

-- CreateIndex
CREATE INDEX "roadmap_categories_section_id_sort_order_idx" ON "roadmap_categories"("section_id", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "roadmap_categories_section_id_key_key" ON "roadmap_categories"("section_id", "key");

-- CreateIndex
CREATE INDEX "roadmap_items_category_id_sort_order_idx" ON "roadmap_items"("category_id", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "roadmap_items_category_id_key_key" ON "roadmap_items"("category_id", "key");

-- CreateIndex
CREATE INDEX "roadmap_links_item_id_sort_order_idx" ON "roadmap_links"("item_id", "sort_order");

-- AddForeignKey
ALTER TABLE "roadmap_categories" ADD CONSTRAINT "roadmap_categories_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "roadmap_sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roadmap_items" ADD CONSTRAINT "roadmap_items_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "roadmap_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roadmap_links" ADD CONSTRAINT "roadmap_links_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "roadmap_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
