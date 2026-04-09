import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import matter from 'gray-matter';

const prisma = new PrismaClient();

const POSTS_DIR = path.resolve(process.cwd(), '../frontend-tales/src/content/posts');

const LOCALES = ['en', 'ru'];

interface Frontmatter {
  title: string;
  date: string;
  description?: string;
  tags?: string[];
}

async function main() {
  // Collect all slugs from any locale directory
  const slugs = new Set<string>();
  for (const locale of LOCALES) {
    const dir = path.join(POSTS_DIR, locale);
    if (!fs.existsSync(dir)) continue;
    for (const file of fs.readdirSync(dir)) {
      if (file.endsWith('.md')) {
        slugs.add(file.replace(/\.md$/, ''));
      }
    }
  }

  console.log(`Found ${slugs.size} articles: ${[...slugs].join(', ')}`);

  for (const slug of slugs) {
    // Read all locale versions
    const translations: { language: string; title: string; description: string; content: string }[] = [];
    let tags: string[] = [];
    let date: string | null = null;
    let coverImage: string | undefined;

    for (const locale of LOCALES) {
      const filePath = path.join(POSTS_DIR, locale, `${slug}.md`);
      if (!fs.existsSync(filePath)) continue;

      const raw = fs.readFileSync(filePath, 'utf8');
      const { data, content } = matter(raw);
      const fm = data as Frontmatter;

      translations.push({
        language: locale,
        title: fm.title,
        description: fm.description || '',
        content: content.trim(),
      });

      // Use tags and date from the first available locale
      if (!date) date = fm.date;
      if (tags.length === 0 && fm.tags) tags = fm.tags;

      // Extract cover image from content
      if (!coverImage) {
        const match = content.match(/!\[.*?\]\((.*?)\)/);
        if (match) coverImage = match[1];
      }
    }

    if (translations.length === 0) continue;

    // Ensure tags exist
    for (const tagName of tags) {
      const tagSlug = tagName.toLowerCase().replace(/\s+/g, '-');
      await prisma.tag.upsert({
        where: { slug: tagSlug },
        create: { name: tagName, slug: tagSlug },
        update: {},
      });
    }

    // Check if article already exists
    const existing = await prisma.article.findUnique({ where: { slug } });
    if (existing) {
      console.log(`  Skipping "${slug}" — already exists`);
      continue;
    }

    // Create article with translations
    const article = await prisma.article.create({
      data: {
        slug,
        coverImageUrl: coverImage,
        status: 'PUBLISHED',
        publishedAt: date ? new Date(date) : new Date(),
        translations: {
          create: translations,
        },
        tags: {
          connect: tags.map((t) => ({ slug: t.toLowerCase().replace(/\s+/g, '-') })),
        },
      },
      include: { translations: true, tags: true },
    });

    console.log(`  Created "${slug}" with ${article.translations.length} translations and ${article.tags.length} tags`);
  }

  console.log('Done!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
