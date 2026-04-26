import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { RoadmapService } from './roadmap.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { RedisService } from '../redis/redis.service.js';
import { CreateRoadmapSectionDto } from './dto/create-roadmap.dto.js';
import { UpdateRoadmapSectionDto } from './dto/update-roadmap.dto.js';
import { ContentStatus } from '../articles/dto/create-article.dto.js';

describe('RoadmapService', () => {
  let service: RoadmapService;

  const mockPrisma = {
    roadmapSection: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
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
        RoadmapService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedis },
      ],
    }).compile();

    service = module.get<RoadmapService>(RoadmapService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return cached value when available', async () => {
      const cached = [{ id: '1' }];
      mockRedis.get.mockResolvedValue(JSON.stringify(cached));

      const result = await service.findAll(true);

      expect(result).toEqual(cached);
      expect(mockPrisma.roadmapSection.findMany).not.toHaveBeenCalled();
    });

    it('should query db without status filter when admin', async () => {
      mockRedis.get.mockResolvedValue(null);
      const sections = [{ id: '1' }];
      mockPrisma.roadmapSection.findMany.mockResolvedValue(sections);

      const result = await service.findAll(true);

      expect(mockPrisma.roadmapSection.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: {} }),
      );
      expect(mockRedis.set).toHaveBeenCalledWith(
        'roadmap:full:admin_true',
        JSON.stringify(sections),
        600,
      );
      expect(result).toBe(sections);
    });

    it('should restrict non-admin to PUBLISHED status', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockPrisma.roadmapSection.findMany.mockResolvedValue([]);

      await service.findAll(false);

      const callArg = mockPrisma.roadmapSection.findMany.mock.calls[0][0];
      expect(callArg.where).toEqual({ status: 'PUBLISHED' });
    });

    it('should default isAdmin to false when not provided', async () => {
      mockRedis.get.mockResolvedValue(null);
      mockPrisma.roadmapSection.findMany.mockResolvedValue([]);

      await service.findAll();

      const callArg = mockPrisma.roadmapSection.findMany.mock.calls[0][0];
      expect(callArg.where).toEqual({ status: 'PUBLISHED' });
    });
  });

  describe('findSectionByKey', () => {
    it('should return section when admin and section exists', async () => {
      const section = { id: '1', key: 'k', status: 'DRAFT' };
      mockPrisma.roadmapSection.findUnique.mockResolvedValue(section);

      const result = await service.findSectionByKey('k', true);
      expect(result).toBe(section);
    });

    it('should return published section to non-admin', async () => {
      const section = { id: '1', key: 'k', status: 'PUBLISHED' };
      mockPrisma.roadmapSection.findUnique.mockResolvedValue(section);

      const result = await service.findSectionByKey('k', false);
      expect(result).toBe(section);
    });

    it('should throw NotFoundException when section not found', async () => {
      mockPrisma.roadmapSection.findUnique.mockResolvedValue(null);
      await expect(service.findSectionByKey('k')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException for non-admin when section is DRAFT', async () => {
      mockPrisma.roadmapSection.findUnique.mockResolvedValue({
        id: '1',
        status: 'DRAFT',
      });
      await expect(service.findSectionByKey('k', false)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('createSection', () => {
    it('should throw ConflictException when key already exists', async () => {
      mockPrisma.roadmapSection.findUnique.mockResolvedValue({ id: 'existing' });
      const dto: CreateRoadmapSectionDto = { key: 'k' };
      await expect(service.createSection(dto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should create a section with no nested data', async () => {
      mockPrisma.roadmapSection.findUnique.mockResolvedValue(null);
      const created = { id: 's1' };
      mockPrisma.roadmapSection.create.mockResolvedValue(created);

      const result = await service.createSection({ key: 'k' });

      expect(mockPrisma.roadmapSection.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ key: 'k', categories: undefined }),
        }),
      );
      expect(mockRedis.delByPattern).toHaveBeenCalledWith('roadmap:*');
      expect(result).toBe(created);
    });

    it('should create nested categories, items, and links with default sortOrder', async () => {
      mockPrisma.roadmapSection.findUnique.mockResolvedValue(null);
      mockPrisma.roadmapSection.create.mockResolvedValue({ id: 's1' });

      const dto: CreateRoadmapSectionDto = {
        key: 'k',
        status: ContentStatus.PUBLISHED,
        categories: [
          {
            key: 'cat',
            items: [
              {
                key: 'item',
                iconUrl: 'https://x/i.png',
                iconAlt: 'i',
                links: [{ label: 'L', url: 'https://x' }],
              },
            ],
          },
        ],
      };

      await service.createSection(dto);

      const callArg = mockPrisma.roadmapSection.create.mock.calls[0][0];
      expect(callArg.data.categories.create[0]).toEqual({
        key: 'cat',
        sortOrder: 0,
        items: {
          create: [
            {
              key: 'item',
              iconUrl: 'https://x/i.png',
              iconAlt: 'i',
              sortOrder: 0,
              links: {
                create: [
                  {
                    label: 'L',
                    url: 'https://x',
                    type: undefined,
                    sortOrder: 0,
                  },
                ],
              },
            },
          ],
        },
      });
    });

    it('should leave items and links undefined when omitted', async () => {
      mockPrisma.roadmapSection.findUnique.mockResolvedValue(null);
      mockPrisma.roadmapSection.create.mockResolvedValue({ id: 's1' });

      await service.createSection({
        key: 'k',
        categories: [{ key: 'cat', sortOrder: 5 }],
      });

      const callArg = mockPrisma.roadmapSection.create.mock.calls[0][0];
      const cat = callArg.data.categories.create[0];
      expect(cat.sortOrder).toBe(5);
      expect(cat.items).toBeUndefined();
    });

    it('should leave links undefined when item has no links', async () => {
      mockPrisma.roadmapSection.findUnique.mockResolvedValue(null);
      mockPrisma.roadmapSection.create.mockResolvedValue({ id: 's1' });

      await service.createSection({
        key: 'k',
        categories: [
          {
            key: 'cat',
            items: [{ key: 'item', iconUrl: 'https://x', iconAlt: 'a' }],
          },
        ],
      });

      const callArg = mockPrisma.roadmapSection.create.mock.calls[0][0];
      expect(callArg.data.categories.create[0].items.create[0].links).toBeUndefined();
    });
  });

  describe('updateSection', () => {
    it('should throw NotFoundException when section does not exist', async () => {
      mockPrisma.roadmapSection.findUnique.mockResolvedValue(null);
      const dto: UpdateRoadmapSectionDto = {};
      await expect(service.updateSection('id', dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should update section and invalidate cache', async () => {
      mockPrisma.roadmapSection.findUnique.mockResolvedValue({ id: 's1' });
      const updated = { id: 's1', key: 'new' };
      mockPrisma.roadmapSection.update.mockResolvedValue(updated);

      const result = await service.updateSection('s1', { key: 'new' });

      expect(mockPrisma.roadmapSection.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 's1' },
          data: { key: 'new' },
        }),
      );
      expect(mockRedis.delByPattern).toHaveBeenCalledWith('roadmap:*');
      expect(result).toBe(updated);
    });
  });

  describe('deleteSection', () => {
    it('should throw NotFoundException when section does not exist', async () => {
      mockPrisma.roadmapSection.findUnique.mockResolvedValue(null);
      await expect(service.deleteSection('id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should delete section and invalidate cache', async () => {
      mockPrisma.roadmapSection.findUnique.mockResolvedValue({ id: 's1' });
      mockPrisma.roadmapSection.delete.mockResolvedValue({});

      const result = await service.deleteSection('s1');

      expect(mockPrisma.roadmapSection.delete).toHaveBeenCalledWith({
        where: { id: 's1' },
      });
      expect(mockRedis.delByPattern).toHaveBeenCalledWith('roadmap:*');
      expect(result).toEqual({ success: true });
    });
  });
});
