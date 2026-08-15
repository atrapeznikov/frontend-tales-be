import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
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

async function main() {
  const email = 'admin@frontendtales.ru';
  const password = 'securePassword123!';
  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      passwordHash: hashedPassword,
      role: 'ADMIN',
      nickname: 'e2eadmin',
      isVerified: true,
    },
    create: {
      email,
      displayName: 'E2E Admin',
      passwordHash: hashedPassword,
      role: 'ADMIN',
      nickname: 'e2eadmin',
      isVerified: true,
    },
  });

  console.log('Seeded admin user:', user.email);

  // Clean up any old test articles to ensure comments/reactions are reset
  await prisma.article.deleteMany({
    where: { slug: 'e2e-comment-test-article' },
  });

  const article = await prisma.article.create({
    data: {
      slug: 'e2e-comment-test-article',
      status: 'PUBLISHED',
      publishedAt: new Date(),
      translations: {
        create: [
          {
            language: 'en',
            title: 'E2E Comment Test Article',
            description: 'This is a test article for comments',
            content: '# E2E Comment Test Article Content',
          },
          {
            language: 'ru',
            title: 'Тестовая статья E2E для комментариев',
            description: 'Это тестовая статья для комментариев',
            content: '# Контент тестовой статьи E2E для комментариев',
          },
        ],
      },
    },
  });

  console.log('Seeded comment test article:', article.slug);

  // Clear Redis cache so the newly seeded article is fetched fresh
  await clearRedisCache();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
