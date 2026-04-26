import { Test, TestingModule } from '@nestjs/testing';
import { ArticlesController } from './articles.controller.js';
import { ArticlesService } from './articles.service.js';
import {
  CreateArticleDto,
  CreateTagDto,
  ContentStatus,
} from './dto/create-article.dto.js';
import { UpdateArticleDto, UpdateTagDto } from './dto/update-article.dto.js';
import { ArticleFilterDto } from './dto/article-filter.dto.js';

describe('ArticlesController', () => {
  let controller: ArticlesController;

  const mockArticlesService = {
    findAllTags: jest.fn(),
    createTag: jest.fn(),
    updateTag: jest.fn(),
    deleteTag: jest.fn(),
    create: jest.fn(),
    findAll: jest.fn(),
    findBySlug: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    incrementViewCount: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ArticlesController],
      providers: [
        { provide: ArticlesService, useValue: mockArticlesService },
      ],
    }).compile();

    controller = module.get<ArticlesController>(ArticlesController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAllTags', () => {
    it('should return all tags', async () => {
      const tags = [{ id: '1', name: 'JS', slug: 'js' }];
      mockArticlesService.findAllTags.mockResolvedValue(tags);

      const result = await controller.findAllTags();

      expect(result).toBe(tags);
      expect(mockArticlesService.findAllTags).toHaveBeenCalledWith();
    });
  });

  describe('createTag', () => {
    it('should create a tag with the provided dto', async () => {
      const dto: CreateTagDto = { name: 'JavaScript', slug: 'javascript' };
      const created = { id: 't1', ...dto };
      mockArticlesService.createTag.mockResolvedValue(created);

      const result = await controller.createTag(dto);

      expect(mockArticlesService.createTag).toHaveBeenCalledWith(dto);
      expect(result).toBe(created);
    });
  });

  describe('updateTag', () => {
    it('should call updateTag service method with id and dto', async () => {
      const dto: UpdateTagDto = { name: 'New Name' };
      mockArticlesService.updateTag.mockResolvedValue({ id: 't1', ...dto });

      const result = await controller.updateTag('t1', dto);

      expect(mockArticlesService.updateTag).toHaveBeenCalledWith('t1', dto);
      expect(result).toEqual({ id: 't1', ...dto });
    });
  });

  describe('deleteTag', () => {
    it('should call deleteTag service method with id', async () => {
      mockArticlesService.deleteTag.mockResolvedValue({ id: 't1' });

      const result = await controller.deleteTag('t1');

      expect(mockArticlesService.deleteTag).toHaveBeenCalledWith('t1');
      expect(result).toEqual({ id: 't1' });
    });
  });

  describe('create', () => {
    it('should create an article with the provided dto', async () => {
      const dto: CreateArticleDto = {
        slug: 'a',
        translations: [
          { language: 'en', title: 't', description: 'd', content: 'c' },
        ],
      };
      const created = { id: 'a1' };
      mockArticlesService.create.mockResolvedValue(created);

      const result = await controller.create(dto);

      expect(mockArticlesService.create).toHaveBeenCalledWith(dto);
      expect(result).toBe(created);
    });
  });

  describe('findAll', () => {
    it('should call service.findAll with filter and isAdmin=true when user is admin', async () => {
      const filter: ArticleFilterDto = { page: 1, limit: 10 };
      mockArticlesService.findAll.mockResolvedValue({ items: [], meta: {} });

      await controller.findAll(filter, { role: 'ADMIN' });

      expect(mockArticlesService.findAll).toHaveBeenCalledWith(filter, true);
    });

    it('should pass isAdmin=false when user is not admin', async () => {
      const filter: ArticleFilterDto = {};
      mockArticlesService.findAll.mockResolvedValue({ items: [], meta: {} });

      await controller.findAll(filter, { role: 'USER' });

      expect(mockArticlesService.findAll).toHaveBeenCalledWith(filter, false);
    });

    it('should pass isAdmin=false when user is undefined', async () => {
      const filter: ArticleFilterDto = {};
      mockArticlesService.findAll.mockResolvedValue({ items: [], meta: {} });

      await controller.findAll(filter, undefined);

      expect(mockArticlesService.findAll).toHaveBeenCalledWith(filter, false);
    });
  });

  describe('findBySlug', () => {
    it('should pass slug, isAdmin and language to service', async () => {
      mockArticlesService.findBySlug.mockResolvedValue({ id: '1' });

      await controller.findBySlug('my-slug', 'en', { role: 'ADMIN' });

      expect(mockArticlesService.findBySlug).toHaveBeenCalledWith(
        'my-slug',
        true,
        'en',
      );
    });

    it('should pass isAdmin=false for non-admin user', async () => {
      mockArticlesService.findBySlug.mockResolvedValue({ id: '1' });

      await controller.findBySlug('s', undefined as unknown as string, null);

      expect(mockArticlesService.findBySlug).toHaveBeenCalledWith(
        's',
        false,
        undefined,
      );
    });
  });

  describe('update', () => {
    it('should call service.update with id and dto', async () => {
      const dto: UpdateArticleDto = { status: ContentStatus.PUBLISHED };
      mockArticlesService.update.mockResolvedValue({ id: 'a1' });

      const result = await controller.update('a1', dto);

      expect(mockArticlesService.update).toHaveBeenCalledWith('a1', dto);
      expect(result).toEqual({ id: 'a1' });
    });
  });

  describe('delete', () => {
    it('should call service.delete with id', async () => {
      mockArticlesService.delete.mockResolvedValue({ success: true });

      const result = await controller.delete('a1');

      expect(mockArticlesService.delete).toHaveBeenCalledWith('a1');
      expect(result).toEqual({ success: true });
    });
  });

  describe('incrementViewCount', () => {
    it('should pass req.ip to service', async () => {
      mockArticlesService.incrementViewCount.mockResolvedValue({ viewCount: 1 });

      const result = await controller.incrementViewCount('s', { ip: '1.2.3.4' });

      expect(mockArticlesService.incrementViewCount).toHaveBeenCalledWith(
        's',
        '1.2.3.4',
      );
      expect(result).toEqual({ viewCount: 1 });
    });

    it('should fall back to socket.remoteAddress when ip is missing', async () => {
      mockArticlesService.incrementViewCount.mockResolvedValue({ viewCount: 1 });

      await controller.incrementViewCount('s', {
        socket: { remoteAddress: '5.6.7.8' },
      });

      expect(mockArticlesService.incrementViewCount).toHaveBeenCalledWith(
        's',
        '5.6.7.8',
      );
    });

    it("should fall back to 'unknown' when ip and socket are unavailable", async () => {
      mockArticlesService.incrementViewCount.mockResolvedValue({ viewCount: 1 });

      await controller.incrementViewCount('s', {});

      expect(mockArticlesService.incrementViewCount).toHaveBeenCalledWith(
        's',
        'unknown',
      );
    });
  });
});
