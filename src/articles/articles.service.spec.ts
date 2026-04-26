import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { ArticlesService } from './articles.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { RedisService } from '../redis/redis.service.js';
import {
  CreateArticleDto,
  CreateTagDto,
  ContentStatus,
} from './dto/create-article.dto.js';
import { UpdateArticleDto, UpdateTagDto } from './dto/update-article.dto.js';
import { ArticleFilterDto } from './dto/article-filter.dto.js';

describe('ArticlesService', () => {
  let service: ArticlesService;

  const mockPrisma = {
    tag: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    article: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    articleTranslation: {
      upsert: jest.fn(),
    },
  };

  const mockRedis = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    delByPattern: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ArticlesService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedis },
      ],
    }).compile();

    service = module.get<ArticlesService>(ArticlesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createTag', () => {
    const dto: CreateTagDto = { name: 'JavaScript', slug: 'javascript' };

    it('should create a tag when slug does not exist', async () => {
      mockPrisma.tag.findUnique.mockResolvedValue(null);
      mockPrisma.tag.create.mockResolvedValue({ id: 't1', ...dto });

      const result = await service.createTag(dto);

      expect(mockPrisma.tag.findUnique).toHaveBeenCalledWith({
        where: { slug: 'javascript' },
      });
      expect(mockPrisma.tag.create).toHaveBeenCalledWith({ data: dto });
      expect(result).toEqual({ id: 't1', ...dto });
    });

    it('should throw ConflictException when slug already exists', async () => {
      mockPrisma.tag.findUnique.mockResolvedValue({ id: 'existing' });

      await expect(service.createTag(dto)).rejects.toThrow(ConflictException);
      await expect(service.createTag(dto)).rejects.toThrow(
        'Tag slug already exists',
      );
      expect(mockPrisma.tag.create).not.toHaveBeenCalled();
    });
  });

  describe('findAllTags', () => {
    it('should return tags ordered by name asc', async () => {
      const tags = [{ id: '1', name: 'A' }];
      mockPrisma.tag.findMany.mockResolvedValue(tags);

      const result = await service.findAllTags();

      expect(mockPrisma.tag.findMany).toHaveBeenCalledWith({
        orderBy: { name: 'asc' },
      });
      expect(result).toBe(tags);
    });

    it('should return empty array when there are no tags', async () => {
      mockPrisma.tag.findMany.mockResolvedValue([]);
      const result = await service.findAllTags();
      expect(result).toEqual([]);
    });
  });

  describe('updateTag', () => {
    it('should call prisma.tag.update with id and data', async () => {
      const dto: UpdateTagDto = { name: 'New' };
      mockPrisma.tag.update.mockResolvedValue({ id: 't1', name: 'New' });

      const result = await service.updateTag('t1', dto);

      expect(mockPrisma.tag.update).toHaveBeenCalledWith({
        where: { id: 't1' },
        data: dto,
      });
      expect(result).toEqual({ id: 't1', name: 'New' });
    });
  });

  describe('deleteTag', () => {
    it('should delete tag by id', async () => {
      mockPrisma.tag.delete.mockResolvedValue({ id: 't1' });
      const result = await service.deleteTag('t1');
      expect(mockPrisma.tag.delete).toHaveBeenCalledWith({
        where: { id: 't1' },
      });
      expect(result).toEqual({ id: 't1' });
    });
  });

  describe('create', () => {
    const baseDto: CreateArticleDto = {
      slug: 'my-article',
      translations: [
        {
          language: 'en',
          title: 'Title',
          description: 'Desc',
          content: 'Content',
        },
      ],
    };

    it('should create an article without tags or status', async () => {
      mockPrisma.article.findUnique.mockResolvedValue(null);
      const created = { id: 'a1', slug: 'my-article' };
      mockPrisma.article.create.mockResolvedValue(created);

      const result = await service.create(baseDto);

      expect(mockPrisma.article.findUnique).toHaveBeenCalledWith({
        where: { slug: 'my-article' },
      });
      expect(mockPrisma.article.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          slug: 'my-article',
          translations: {
            create: [
              {
                language: 'en',
                title: 'Title',
                description: 'Desc',
                content: 'Content',
              },
            ],
          },
        }),
        include: { translations: true, tags: true },
      });
      expect(mockRedis.delByPattern).toHaveBeenCalledWith('articles:list:*');
      expect(result).toBe(created);
    });

    it('should connect tags when provided', async () => {
      mockPrisma.article.findUnique.mockResolvedValue(null);
      mockPrisma.article.create.mockResolvedValue({ id: 'a1' });

      await service.create({ ...baseDto, tags: ['js', 'react'] });

      const callArg = mockPrisma.article.create.mock.calls[0][0];
      expect(callArg.data.tags).toEqual({
        connect: [{ slug: 'js' }, { slug: 'react' }],
      });
    });

    it('should not set tags connect when tags array is empty', async () => {
      mockPrisma.article.findUnique.mockResolvedValue(null);
      mockPrisma.article.create.mockResolvedValue({ id: 'a1' });

      await service.create({ ...baseDto, tags: [] });

      const callArg = mockPrisma.article.create.mock.calls[0][0];
      expect(callArg.data.tags).toBeUndefined();
    });

    it('should set publishedAt when status is PUBLISHED and no publishedAt set', async () => {
      mockPrisma.article.findUnique.mockResolvedValue(null);
      mockPrisma.article.create.mockResolvedValue({ id: 'a1' });

      await service.create({ ...baseDto, status: ContentStatus.PUBLISHED });

      const callArg = mockPrisma.article.create.mock.calls[0][0];
      expect(callArg.data.publishedAt).toBeInstanceOf(Date);
    });

    it('should not override publishedAt when status is DRAFT', async () => {
      mockPrisma.article.findUnique.mockResolvedValue(null);
      mockPrisma.article.create.mockResolvedValue({ id: 'a1' });

      await service.create({ ...baseDto, status: ContentStatus.DRAFT });

      const callArg = mockPrisma.article.create.mock.calls[0][0];
      expect(callArg.data.publishedAt).toBeUndefined();
    });

    it('should throw ConflictException when slug already exists', async () => {
      mockPrisma.article.findUnique.mockResolvedValue({ id: 'existing' });

      await expect(service.create(baseDto)).rejects.toThrow(ConflictException);
      expect(mockPrisma.article.create).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    const baseFilter: ArticleFilterDto = { page: 1, limit: 10 };

    it('should return cached value when available', async () => {
      const cached = { items: [{ id: '1' }], meta: {} };
      mockRedis.get.mockResolvedValue(JSON.stringify(cached));

      const result = await service.findAll(baseFilter, true);

      expect(result).toEqual(cached);
      expect(mockPrisma.article.findMany).not.toHaveBeenCalled();
      expect(mockPrisma.article.count).not.toHaveBeenCalled();
    });

    it('should query database when not cached and return paginated result for admin', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockPrisma.article.findMany.mockResolvedValue([{ id: '1' }]);
      mockPrisma.article.count.mockResolvedValue(1);

      const result = await service.findAll(
        { page: 2, limit: 5, status: ContentStatus.DRAFT },
        true,
      );

      expect(mockPrisma.article.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: ContentStatus.DRAFT },
          skip: 5,
          take: 5,
          include: { translations: true, tags: true },
          orderBy: { publishedAt: 'desc' },
        }),
      );
      expect(result).toEqual({
        items: [{ id: '1' }],
        meta: { total: 1, page: 2, limit: 5, totalPages: 1 },
      });
      expect(mockRedis.set).toHaveBeenCalled();
    });

    it('should override status to PUBLISHED for non-admin', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockPrisma.article.findMany.mockResolvedValue([]);
      mockPrisma.article.count.mockResolvedValue(0);

      await service.findAll(
        { status: ContentStatus.DRAFT } as ArticleFilterDto,
        false,
      );

      const callArg = mockPrisma.article.findMany.mock.calls[0][0];
      expect(callArg.where.status).toBe('PUBLISHED');
    });

    it('should filter by tag when provided', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockPrisma.article.findMany.mockResolvedValue([]);
      mockPrisma.article.count.mockResolvedValue(0);

      await service.findAll({ tag: 'js' } as ArticleFilterDto, true);

      const callArg = mockPrisma.article.findMany.mock.calls[0][0];
      expect(callArg.where.tags).toEqual({ some: { slug: 'js' } });
    });

    it('should filter and include only translations for given language', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockPrisma.article.findMany.mockResolvedValue([]);
      mockPrisma.article.count.mockResolvedValue(0);

      await service.findAll({ language: 'ru' } as ArticleFilterDto, true);

      const callArg = mockPrisma.article.findMany.mock.calls[0][0];
      expect(callArg.where.translations).toEqual({ some: { language: 'ru' } });
      expect(callArg.include.translations).toEqual({ where: { language: 'ru' } });
    });

    it('should default to page 1 and limit 10 when no pagination provided', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockPrisma.article.findMany.mockResolvedValue([]);
      mockPrisma.article.count.mockResolvedValue(0);

      const result = await service.findAll({} as ArticleFilterDto, true);

      expect(mockPrisma.article.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 10 }),
      );
      expect(result.meta).toEqual({
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
      });
    });
  });

  describe('findBySlug', () => {
    it('should return cached value when present', async () => {
      const cached = { id: '1', slug: 's' };
      mockRedis.get.mockResolvedValue(JSON.stringify(cached));

      const result = await service.findBySlug('s', false);

      expect(result).toEqual(cached);
      expect(mockPrisma.article.findUnique).not.toHaveBeenCalled();
    });

    it('should return article from db when not cached and is published', async () => {
      mockRedis.get.mockResolvedValue(null);
      const article = { id: '1', slug: 's', status: 'PUBLISHED' };
      mockPrisma.article.findUnique.mockResolvedValue(article);

      const result = await service.findBySlug('s', false);

      expect(result).toBe(article);
      expect(mockRedis.set).toHaveBeenCalled();
    });

    it('should pass language filter to translations include', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockPrisma.article.findUnique.mockResolvedValue({
        id: '1',
        slug: 's',
        status: 'PUBLISHED',
      });

      await service.findBySlug('s', true, 'en');

      const callArg = mockPrisma.article.findUnique.mock.calls[0][0];
      expect(callArg.include.translations).toEqual({ where: { language: 'en' } });
    });

    it('should throw NotFoundException when article does not exist', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockPrisma.article.findUnique.mockResolvedValue(null);

      await expect(service.findBySlug('missing', true)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException for non-admin when article is not published', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockPrisma.article.findUnique.mockResolvedValue({
        id: '1',
        slug: 's',
        status: 'DRAFT',
      });

      await expect(service.findBySlug('s', false)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return draft article for admin', async () => {
      mockRedis.get.mockResolvedValue(null);
      const article = { id: '1', slug: 's', status: 'DRAFT' };
      mockPrisma.article.findUnique.mockResolvedValue(article);

      const result = await service.findBySlug('s', true);

      expect(result).toBe(article);
    });
  });

  describe('update', () => {
    const dto: UpdateArticleDto = {};

    it('should throw NotFoundException when article does not exist', async () => {
      mockPrisma.article.findUnique.mockResolvedValue(null);
      await expect(service.update('id', dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should update article and invalidate cache', async () => {
      mockPrisma.article.findUnique.mockResolvedValue({
        id: 'a1',
        slug: 'old',
        status: 'DRAFT',
        publishedAt: null,
      });
      const updated = { id: 'a1', slug: 'old' };
      mockPrisma.article.update.mockResolvedValue(updated);

      const result = await service.update('a1', { slug: 'old' } as UpdateArticleDto);

      expect(mockPrisma.article.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'a1' } }),
      );
      expect(mockRedis.delByPattern).toHaveBeenCalledWith('articles:list:*');
      expect(mockRedis.delByPattern).toHaveBeenCalledWith('articles:slug:old:*');
      expect(result).toBe(updated);
    });

    it('should set publishedAt when transitioning to PUBLISHED', async () => {
      mockPrisma.article.findUnique.mockResolvedValue({
        id: 'a1',
        slug: 's',
        status: 'DRAFT',
        publishedAt: null,
      });
      mockPrisma.article.update.mockResolvedValue({ id: 'a1', slug: 's' });

      await service.update('a1', { status: ContentStatus.PUBLISHED });

      const callArg = mockPrisma.article.update.mock.calls[0][0];
      expect(callArg.data.publishedAt).toBeInstanceOf(Date);
    });

    it('should not set publishedAt when article was already published', async () => {
      mockPrisma.article.findUnique.mockResolvedValue({
        id: 'a1',
        slug: 's',
        status: 'PUBLISHED',
        publishedAt: new Date('2024-01-01'),
      });
      mockPrisma.article.update.mockResolvedValue({ id: 'a1', slug: 's' });

      await service.update('a1', { status: ContentStatus.PUBLISHED });

      const callArg = mockPrisma.article.update.mock.calls[0][0];
      expect(callArg.data.publishedAt).toBeUndefined();
    });

    it('should set tags relation when tags provided', async () => {
      mockPrisma.article.findUnique.mockResolvedValue({
        id: 'a1',
        slug: 's',
        status: 'DRAFT',
      });
      mockPrisma.article.update.mockResolvedValue({ id: 'a1', slug: 's' });

      await service.update('a1', { tags: ['js'] });

      const callArg = mockPrisma.article.update.mock.calls[0][0];
      expect(callArg.data.tags).toEqual({ set: [{ slug: 'js' }] });
    });

    it('should upsert translations when provided', async () => {
      mockPrisma.article.findUnique.mockResolvedValue({
        id: 'a1',
        slug: 's',
        status: 'DRAFT',
      });
      mockPrisma.article.update.mockResolvedValue({ id: 'a1', slug: 's' });
      mockPrisma.articleTranslation.upsert.mockResolvedValue({});

      await service.update('a1', {
        translations: [
          {
            language: 'en',
            title: 'T',
            description: 'D',
            content: 'C',
          },
        ],
      });

      expect(mockPrisma.articleTranslation.upsert).toHaveBeenCalledWith({
        where: { articleId_language: { articleId: 'a1', language: 'en' } },
        create: {
          articleId: 'a1',
          language: 'en',
          title: 'T',
          description: 'D',
          content: 'C',
        },
        update: { title: 'T', description: 'D', content: 'C' },
      });
    });

    it('should not upsert translations when array is empty', async () => {
      mockPrisma.article.findUnique.mockResolvedValue({
        id: 'a1',
        slug: 's',
        status: 'DRAFT',
      });
      mockPrisma.article.update.mockResolvedValue({ id: 'a1', slug: 's' });

      await service.update('a1', { translations: [] });

      expect(mockPrisma.articleTranslation.upsert).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should throw NotFoundException when article does not exist', async () => {
      mockPrisma.article.findUnique.mockResolvedValue(null);
      await expect(service.delete('id')).rejects.toThrow(NotFoundException);
    });

    it('should delete article and invalidate cache', async () => {
      mockPrisma.article.findUnique.mockResolvedValue({
        id: 'a1',
        slug: 'my-slug',
      });
      mockPrisma.article.delete.mockResolvedValue({});

      const result = await service.delete('a1');

      expect(mockPrisma.article.delete).toHaveBeenCalledWith({
        where: { id: 'a1' },
      });
      expect(mockRedis.delByPattern).toHaveBeenCalledWith('articles:list:*');
      expect(mockRedis.delByPattern).toHaveBeenCalledWith(
        'articles:slug:my-slug:*',
      );
      expect(result).toEqual({ success: true });
    });
  });

  describe('incrementViewCount', () => {
    it('should return current viewCount when ip already counted', async () => {
      mockRedis.get.mockResolvedValue('1');
      mockPrisma.article.findUnique.mockResolvedValue({ viewCount: 42 });

      const result = await service.incrementViewCount('s', '1.2.3.4');

      expect(result).toEqual({ viewCount: 42 });
      expect(mockPrisma.article.update).not.toHaveBeenCalled();
    });

    it('should return 0 when already-counted article is not found', async () => {
      mockRedis.get.mockResolvedValue('1');
      mockPrisma.article.findUnique.mockResolvedValue(null);

      const result = await service.incrementViewCount('s', '1.2.3.4');

      expect(result).toEqual({ viewCount: 0 });
    });

    it('should increment view count and set dedup key when not counted', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockPrisma.article.update.mockResolvedValue({ viewCount: 5 });

      const result = await service.incrementViewCount('s', '1.2.3.4');

      expect(mockRedis.set).toHaveBeenCalledWith(
        'views:dedup:s:1.2.3.4',
        '1',
        3600,
      );
      expect(mockPrisma.article.update).toHaveBeenCalledWith({
        where: { slug: 's' },
        data: { viewCount: { increment: 1 } },
      });
      expect(mockRedis.delByPattern).toHaveBeenCalledWith('articles:slug:s:*');
      expect(result).toEqual({ viewCount: 5 });
    });
  });
});
