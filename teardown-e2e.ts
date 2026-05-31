import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import Redis from 'ioredis';

const prisma = new PrismaClient();

function loadEnv() {
  const envPath = path.resolve(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const index = trimmed.indexOf('=');
      if (index > -1) {
        const key = trimmed.substring(0, index).trim();
        const val = trimmed.substring(index + 1).trim();
        process.env[key] = val;
      }
    }
  }
}

async function clearRedisCache() {
  loadEnv();
  const redis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: Number(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
  });

  try {
    const keys = await redis.keys('articles:slug:e2e-comment-test-article:*');
    if (keys.length > 0) {
      await redis.del(...keys);
      console.log(`Cleared ${keys.length} Redis cache key(s) for e2e-comment-test-article.`);
    }
    const listKeys = await redis.keys('articles:list:*');
    if (listKeys.length > 0) {
      await redis.del(...listKeys);
      console.log(`Cleared ${listKeys.length} Redis list cache key(s).`);
    }
  } catch (err) {
    console.error('Failed to clear Redis cache:', err);
  } finally {
    await redis.quit();
  }
}

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
      OR: [
        { slug: { startsWith: 'real-article-' } },
        { slug: 'e2e-comment-test-article' },
      ],
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

  // --- Users ---
  const { count: userCount } = await prisma.user.deleteMany({
    where: {
      email: { endsWith: '@frontendtales.ru' },
    },
  });
  console.log(`Deleted ${userCount} E2E user(s).`);

  // Clear Redis cache so the deleted items are removed from cache as well
  await clearRedisCache();

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
