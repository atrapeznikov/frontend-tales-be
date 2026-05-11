import { PrismaClient } from '@prisma/client';
import { ruData } from './seed-ru';
import { enData } from './seed-en';

const prisma = new PrismaClient();

function kebabToCamel(str: string): string {
    return str.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
}

async function main() {
  const ruSections = (ruData as any).Roadmap.sections;
  const enSections = (enData as any).Roadmap.sections;

  const sections = await prisma.roadmapSection.findMany({
    include: {
      categories: {
        include: {
          items: true,
        },
      },
    },
  });

  for (const section of sections) {
    const sectionKey = kebabToCamel(section.key);
    const ruTitle = ruSections[sectionKey]?.title;
    const enTitle = enSections[sectionKey]?.title;

    if (ruTitle) {
      await prisma.roadmapSectionTranslation.upsert({
        where: { sectionId_language: { sectionId: section.id, language: 'ru' } },
        update: { title: ruTitle },
        create: { sectionId: section.id, language: 'ru', title: ruTitle },
      });
    }
    if (enTitle) {
      await prisma.roadmapSectionTranslation.upsert({
        where: { sectionId_language: { sectionId: section.id, language: 'en' } },
        update: { title: enTitle },
        create: { sectionId: section.id, language: 'en', title: enTitle },
      });
    }

    for (const cat of section.categories) {
      const catKey = kebabToCamel(cat.key);
      const ruCatName = ruSections[sectionKey]?.categories[catKey]?.name;
      const enCatName = enSections[sectionKey]?.categories[catKey]?.name;

      if (ruCatName) {
        await prisma.roadmapCategoryTranslation.upsert({
          where: { categoryId_language: { categoryId: cat.id, language: 'ru' } },
          update: { name: ruCatName },
          create: { categoryId: cat.id, language: 'ru', name: ruCatName },
        });
      }
      if (enCatName) {
        await prisma.roadmapCategoryTranslation.upsert({
          where: { categoryId_language: { categoryId: cat.id, language: 'en' } },
          update: { name: enCatName },
          create: { categoryId: cat.id, language: 'en', name: enCatName },
        });
      }

      for (const item of cat.items) {
        const itemKey = item.key;
        const ruItemTitle = ruSections[sectionKey]?.categories[catKey]?.items[itemKey]?.title;
        const ruItemDesc = ruSections[sectionKey]?.categories[catKey]?.items[itemKey]?.description;
        const enItemTitle = enSections[sectionKey]?.categories[catKey]?.items[itemKey]?.title;
        const enItemDesc = enSections[sectionKey]?.categories[catKey]?.items[itemKey]?.description;

        if (ruItemTitle) {
          await prisma.roadmapItemTranslation.upsert({
            where: { itemId_language: { itemId: item.id, language: 'ru' } },
            update: { title: ruItemTitle, description: ruItemDesc || '' },
            create: { itemId: item.id, language: 'ru', title: ruItemTitle, description: ruItemDesc || '' },
          });
        }
        if (enItemTitle) {
          await prisma.roadmapItemTranslation.upsert({
            where: { itemId_language: { itemId: item.id, language: 'en' } },
            update: { title: enItemTitle, description: enItemDesc || '' },
            create: { itemId: item.id, language: 'en', title: enItemTitle, description: enItemDesc || '' },
          });
        }
      }
    }
  }

  console.log('✅ Roadmap translations seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
