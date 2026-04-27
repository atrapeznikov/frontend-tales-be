import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Removes all test data seeded or created by E2E tests.
 *
 * Patterns used by tests:
 *   - Article slugs   : starts with "real-article-"
 *   - Tag slugs       : starts with "tag-"
 *   - Roadmap keys    : starts with "pub-", "draft-", or "e2e-testing-"
 */
async function main() {
  console.log('Running E2E teardown: cleaning test data...');

  // --- Articles ---
  const { count: articleCount } = await prisma.article.deleteMany({
    where: {
      slug: { startsWith: 'real-article-' },
    },
  });
  console.log(`Deleted ${articleCount} E2E article(s).`);

  // --- Tags ---
  const { count: tagCount } = await prisma.tag.deleteMany({
    where: {
      slug: { startsWith: 'tag-' },
    },
  });
  console.log(`Deleted ${tagCount} E2E tag(s).`);

  // --- Roadmap sections ---
  const { count: roadmapCount } = await prisma.roadmapSection.deleteMany({
    where: {
      OR: [
        { key: { startsWith: 'pub-' } },
        { key: { startsWith: 'draft-' } },
        { key: { startsWith: 'e2e-testing-' } },
      ],
    },
  });
  console.log(`Deleted ${roadmapCount} E2E roadmap section(s).`);

  console.log('E2E teardown complete.');
}

main()
  .catch((e) => {
    console.error('Teardown failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
