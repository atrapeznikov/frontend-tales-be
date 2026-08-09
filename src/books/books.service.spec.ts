import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { BooksService } from './books.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { BookFilterDto } from './dto/book-filter.dto.js';

describe('BooksService', () => {
  let service: BooksService;

  const mockPrisma = {
    book: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  const baseBook = {
    id: 'b1',
    title: 'Designing Data-Intensive Applications',
    author: 'Martin Kleppmann',
    description: 'A book about data systems',
    coverUrl: 'https://cdn.site.com/covers/ddia.jpg',
    language: 'EN',
    status: 'RECOMMENDED',
    rating: 5,
    reviewText: '## Why this book matters',
    tags: ['tech', 'architecture'],
    purchaseLinks: ['https://amazon.com/dp/1449373321'],
    createdAt: new Date('2026-03-15T10:30:00Z'),
    updatedAt: new Date('2026-03-15T10:30:00Z'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BooksService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<BooksService>(BooksService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    const baseFilter: BookFilterDto = { site_lang: 'ru' };

    it('should include RU and EN books when site_lang is ru', async () => {
      mockPrisma.book.findMany.mockResolvedValue([baseBook]);
      mockPrisma.book.count.mockResolvedValue(1);

      await service.findAll(baseFilter);

      const callArg = mockPrisma.book.findMany.mock.calls[0][0];
      expect(callArg.where.language).toEqual({ in: ['RU', 'EN'] });
    });

    it('should include only EN books when site_lang is en', async () => {
      mockPrisma.book.findMany.mockResolvedValue([baseBook]);
      mockPrisma.book.count.mockResolvedValue(1);

      await service.findAll({ site_lang: 'en' });

      const callArg = mockPrisma.book.findMany.mock.calls[0][0];
      expect(callArg.where.language).toBe('EN');
    });

    it('should filter by status when provided', async () => {
      mockPrisma.book.findMany.mockResolvedValue([]);
      mockPrisma.book.count.mockResolvedValue(0);

      await service.findAll({ site_lang: 'ru', status: 'not_recommended' });

      const callArg = mockPrisma.book.findMany.mock.calls[0][0];
      expect(callArg.where.status).toBe('NOT_RECOMMENDED');
    });

    it('should filter by tag when provided', async () => {
      mockPrisma.book.findMany.mockResolvedValue([]);
      mockPrisma.book.count.mockResolvedValue(0);

      await service.findAll({ site_lang: 'ru', tag: 'js' });

      const callArg = mockPrisma.book.findMany.mock.calls[0][0];
      expect(callArg.where.tags).toEqual({ has: 'js' });
    });

    it('should search by title and author when search provided', async () => {
      mockPrisma.book.findMany.mockResolvedValue([]);
      mockPrisma.book.count.mockResolvedValue(0);

      await service.findAll({ site_lang: 'ru', search: 'kleppmann' });

      const callArg = mockPrisma.book.findMany.mock.calls[0][0];
      expect(callArg.where.OR).toEqual([
        { title: { contains: 'kleppmann', mode: 'insensitive' } },
        { author: { contains: 'kleppmann', mode: 'insensitive' } },
      ]);
    });

    it('should default sort to -created_at desc', async () => {
      mockPrisma.book.findMany.mockResolvedValue([]);
      mockPrisma.book.count.mockResolvedValue(0);

      await service.findAll(baseFilter);

      const callArg = mockPrisma.book.findMany.mock.calls[0][0];
      expect(callArg.orderBy).toEqual({ createdAt: 'desc' });
    });

    it('should sort by rating ascending when sort=rating', async () => {
      mockPrisma.book.findMany.mockResolvedValue([]);
      mockPrisma.book.count.mockResolvedValue(0);

      await service.findAll({ site_lang: 'ru', sort: 'rating' });

      const callArg = mockPrisma.book.findMany.mock.calls[0][0];
      expect(callArg.orderBy).toEqual({ rating: 'asc' });
    });

    it('should apply pagination', async () => {
      mockPrisma.book.findMany.mockResolvedValue([]);
      mockPrisma.book.count.mockResolvedValue(0);

      await service.findAll({ site_lang: 'ru', page: 3, limit: 5 });

      const callArg = mockPrisma.book.findMany.mock.calls[0][0];
      expect(callArg.skip).toBe(10);
      expect(callArg.take).toBe(5);
    });

    it('should map results to list item shape and build meta', async () => {
      mockPrisma.book.findMany.mockResolvedValue([baseBook]);
      mockPrisma.book.count.mockResolvedValue(21);

      const result = await service.findAll({
        site_lang: 'ru',
        page: 2,
        limit: 20,
      });

      expect(result.data).toEqual([
        {
          id: 'b1',
          title: baseBook.title,
          author: baseBook.author,
          cover_url: baseBook.coverUrl,
          description: baseBook.description,
          language: 'en',
          status: 'recommended',
          rating: 5,
          tags: baseBook.tags,
          created_at: baseBook.createdAt,
          purchase_links: baseBook.purchaseLinks,
        },
      ]);
      expect(result.meta).toEqual({
        current_page: 2,
        total_pages: 2,
        total_items: 21,
      });
      expect((result.data[0] as any).review_text).toBeUndefined();
    });

    it('should return zero total_pages when there are no items', async () => {
      mockPrisma.book.findMany.mockResolvedValue([]);
      mockPrisma.book.count.mockResolvedValue(0);

      const result = await service.findAll(baseFilter);

      expect(result.meta).toEqual({
        current_page: 1,
        total_pages: 0,
        total_items: 0,
      });
    });
  });

  describe('findOne', () => {
    it('should throw NotFoundException when book does not exist', async () => {
      mockPrisma.book.findUnique.mockResolvedValue(null);

      await expect(service.findOne('missing')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return the book detail including review_text and updated_at', async () => {
      mockPrisma.book.findUnique.mockResolvedValue(baseBook);

      const result = await service.findOne('b1');

      expect(mockPrisma.book.findUnique).toHaveBeenCalledWith({
        where: { id: 'b1' },
      });
      expect(result).toEqual({
        id: 'b1',
        title: baseBook.title,
        author: baseBook.author,
        cover_url: baseBook.coverUrl,
        description: baseBook.description,
        language: 'en',
        status: 'recommended',
        rating: 5,
        tags: baseBook.tags,
        created_at: baseBook.createdAt,
        purchase_links: baseBook.purchaseLinks,
        review_text: baseBook.reviewText,
        updated_at: baseBook.updatedAt,
      });
    });
  });

  describe('findAllTags', () => {
    it('should return sorted unique tags across all books', async () => {
      mockPrisma.book.findMany.mockResolvedValue([
        { tags: ['js', 'algo'] },
        { tags: ['algo', 'tech'] },
      ]);

      const result = await service.findAllTags();

      expect(mockPrisma.book.findMany).toHaveBeenCalledWith({
        select: { tags: true },
      });
      expect(result).toEqual(['algo', 'js', 'tech']);
    });

    it('should return empty array when there are no books', async () => {
      mockPrisma.book.findMany.mockResolvedValue([]);

      const result = await service.findAllTags();

      expect(result).toEqual([]);
    });
  });

  describe('create', () => {
    it('should create a book and return the detail shape', async () => {
      const dto = {
        title: baseBook.title,
        author: baseBook.author,
        language: 'EN' as any,
      };
      mockPrisma.book.create.mockResolvedValue(baseBook);

      const result = await service.create(dto);

      expect(mockPrisma.book.create).toHaveBeenCalledWith({ data: dto });
      expect(result).toEqual({
        id: 'b1',
        title: baseBook.title,
        author: baseBook.author,
        cover_url: baseBook.coverUrl,
        description: baseBook.description,
        language: 'en',
        status: 'recommended',
        rating: 5,
        tags: baseBook.tags,
        created_at: baseBook.createdAt,
        purchase_links: baseBook.purchaseLinks,
        review_text: baseBook.reviewText,
        updated_at: baseBook.updatedAt,
      });
    });
  });

  describe('update', () => {
    it('should throw NotFoundException when book does not exist', async () => {
      mockPrisma.book.findUnique.mockResolvedValue(null);

      await expect(service.update('missing', { rating: 4 })).rejects.toThrow(
        NotFoundException,
      );
      expect(mockPrisma.book.update).not.toHaveBeenCalled();
    });

    it('should update the book and return the detail shape', async () => {
      mockPrisma.book.findUnique.mockResolvedValue(baseBook);
      const updatedBook = { ...baseBook, rating: 4 };
      mockPrisma.book.update.mockResolvedValue(updatedBook);

      const result = await service.update('b1', { rating: 4 });

      expect(mockPrisma.book.update).toHaveBeenCalledWith({
        where: { id: 'b1' },
        data: { rating: 4 },
      });
      expect(result.rating).toBe(4);
    });
  });

  describe('delete', () => {
    it('should throw NotFoundException when book does not exist', async () => {
      mockPrisma.book.findUnique.mockResolvedValue(null);

      await expect(service.delete('missing')).rejects.toThrow(
        NotFoundException,
      );
      expect(mockPrisma.book.delete).not.toHaveBeenCalled();
    });

    it('should delete the book', async () => {
      mockPrisma.book.findUnique.mockResolvedValue(baseBook);
      mockPrisma.book.delete.mockResolvedValue(baseBook);

      const result = await service.delete('b1');

      expect(mockPrisma.book.delete).toHaveBeenCalledWith({
        where: { id: 'b1' },
      });
      expect(result).toEqual({ success: true });
    });
  });
});
