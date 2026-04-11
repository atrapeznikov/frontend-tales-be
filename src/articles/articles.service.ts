import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { RedisService } from '../redis/redis.service.js';
import { CreateArticleDto, CreateTagDto } from './dto/create-article.dto.js';
import { UpdateArticleDto, UpdateTagDto } from './dto/update-article.dto.js';
import { ArticleFilterDto } from './dto/article-filter.dto.js';

@Injectable()
export class ArticlesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  // ─── Tags ─────────────────────────────────────────────────────────────

  async createTag(dto: CreateTagDto) {
    const existing = await this.prisma.tag.findUnique({
      where: { slug: dto.slug },
    });
    if (existing) throw new ConflictException('Tag slug already exists');

    return this.prisma.tag.create({ data: dto });
  }

  async findAllTags() {
    return this.prisma.tag.findMany({ orderBy: { name: 'asc' } });
  }

  async updateTag(id: string, dto: UpdateTagDto) {
    return this.prisma.tag.update({
      where: { id },
      data: dto,
    });
  }

  async deleteTag(id: string) {
    return this.prisma.tag.delete({ where: { id } });
  }

  // ─── Articles ─────────────────────────────────────────────────────────

  async create(dto: CreateArticleDto) {
    const { tags, translations, ...articleData } = dto;

    const existing = await this.prisma.article.findUnique({ where: { slug: dto.slug } });
    if (existing) throw new ConflictException('Article with this slug already exists');

    const data: any = {
      ...articleData,
      translations: {
        create: translations.map(t => ({
          language: t.language,
          title: t.title,
          description: t.description,
          content: t.content,
        })),
      },
    };

    if (tags && tags.length > 0) {
      data.tags = {
        connect: tags.map((slug) => ({ slug })),
      };
    }

    if (data.status === 'PUBLISHED' && !data.publishedAt) {
      data.publishedAt = new Date();
    }

    const article = await this.prisma.article.create({
      data,
      include: { translations: true, tags: true },
    });

    await this.invalidateArticlesCache();
    return article;
  }

  async findAll(filter: ArticleFilterDto, isAdmin: boolean = false) {
    const { page = 1, limit = 10, tag, status, language } = filter;

    const cacheKey = `articles:list:${page}:${limit}:${tag || 'all'}:${status || 'all'}:${language || 'all'}:admin_${isAdmin}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const where: any = {};
    if (status) where.status = status;

    if (!isAdmin) {
      where.status = 'PUBLISHED';
    }
    if (tag) {
      where.tags = { some: { slug: tag } };
    }

    // If language is specified, only return articles that have a translation in that language
    if (language) {
      where.translations = { some: { language } };
    }

    const translationsInclude = language
      ? { where: { language } }
      : true;

    const [items, total] = await Promise.all([
      this.prisma.article.findMany({
        where,
        include: { translations: translationsInclude, tags: true },
        orderBy: { publishedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.article.count({ where }),
    ]);

    const result = {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };

    await this.redis.set(cacheKey, JSON.stringify(result), 300);
    return result;
  }

  async findBySlug(slug: string, isAdmin: boolean = false, language?: string) {
    const cacheKey = `articles:slug:${slug}:${language || 'all'}:admin_${isAdmin}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const translationsInclude = language
      ? { where: { language } }
      : true;

    const article = await this.prisma.article.findUnique({
      where: { slug },
      include: { translations: translationsInclude, tags: true },
    });

    if (!article) throw new NotFoundException('Article not found');

    if (!isAdmin && article.status !== 'PUBLISHED') {
      throw new NotFoundException('Article not found');
    }

    await this.redis.set(cacheKey, JSON.stringify(article), 600);
    return article;
  }

  async update(id: string, dto: UpdateArticleDto) {
    const { tags, translations, ...articleData } = dto;
    const data: any = { ...articleData };

    if (tags) {
      data.tags = {
        set: tags.map((slug) => ({ slug })),
      };
    }

    const article = await this.prisma.article.findUnique({ where: { id } });
    if (!article) throw new NotFoundException('Article not found');

    if (data.status === 'PUBLISHED' && article.status !== 'PUBLISHED' && !article.publishedAt) {
      data.publishedAt = new Date();
    }

    // Update translations using upsert
    if (translations && translations.length > 0) {
      await Promise.all(
        translations.map(t =>
          this.prisma.articleTranslation.upsert({
            where: {
              articleId_language: { articleId: id, language: t.language },
            },
            create: {
              articleId: id,
              language: t.language,
              title: t.title,
              description: t.description,
              content: t.content,
            },
            update: {
              title: t.title,
              description: t.description,
              content: t.content,
            },
          }),
        ),
      );
    }

    const updated = await this.prisma.article.update({
      where: { id },
      data,
      include: { translations: true, tags: true },
    });

    await this.invalidateArticlesCache(updated.slug);
    return updated;
  }

  async delete(id: string) {
    const article = await this.prisma.article.findUnique({ where: { id } });
    if (!article) throw new NotFoundException('Article not found');

    await this.prisma.article.delete({ where: { id } });
    await this.invalidateArticlesCache(article.slug);

    return { success: true };
  }

  async incrementViewCount(slug: string, ip: string) {
    // Deduplicate: one view per IP per article per hour
    const dedupeKey = `views:dedup:${slug}:${ip}`;
    const alreadyCounted = await this.redis.get(dedupeKey);
    if (alreadyCounted) {
      const article = await this.prisma.article.findUnique({ where: { slug }, select: { viewCount: true } });
      return { viewCount: article?.viewCount ?? 0 };
    }

    await this.redis.set(dedupeKey, '1', 3600); // 1 hour window

    const article = await this.prisma.article.update({
      where: { slug },
      data: { viewCount: { increment: 1 } },
    });

    await this.redis.delByPattern(`articles:slug:${slug}:*`);

    return { viewCount: article.viewCount };
  }

  private async invalidateArticlesCache(slug?: string) {
    await this.redis.delByPattern('articles:list:*');

    if (slug) {
      await this.redis.delByPattern(`articles:slug:${slug}:*`);
    }
  }
}
