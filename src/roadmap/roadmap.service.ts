import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { RedisService } from '../redis/redis.service.js';
import { CreateRoadmapSectionDto } from './dto/create-roadmap.dto.js';
import { UpdateRoadmapSectionDto } from './dto/update-roadmap.dto.js';

const CACHE_KEY = 'roadmap:full';
const CACHE_TTL = 600;

@Injectable()
export class RoadmapService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async findAll() {
    const cached = await this.redis.get(CACHE_KEY);
    if (cached) return JSON.parse(cached);

    const sections = await this.prisma.roadmapSection.findMany({
      orderBy: { sortOrder: 'asc' },
      include: {
        categories: {
          orderBy: { sortOrder: 'asc' },
          include: {
            items: {
              orderBy: { sortOrder: 'asc' },
              include: {
                links: {
                  orderBy: { sortOrder: 'asc' },
                },
              },
            },
          },
        },
      },
    });

    await this.redis.set(CACHE_KEY, JSON.stringify(sections), CACHE_TTL);
    return sections;
  }

  async findSectionByKey(key: string) {
    const section = await this.prisma.roadmapSection.findUnique({
      where: { key },
      include: {
        categories: {
          orderBy: { sortOrder: 'asc' },
          include: {
            items: {
              orderBy: { sortOrder: 'asc' },
              include: {
                links: {
                  orderBy: { sortOrder: 'asc' },
                },
              },
            },
          },
        },
      },
    });

    if (!section) throw new NotFoundException('Section not found');
    return section;
  }

  async createSection(dto: CreateRoadmapSectionDto) {
    const existing = await this.prisma.roadmapSection.findUnique({
      where: { key: dto.key },
    });
    if (existing) throw new ConflictException('Section key already exists');

    const { categories, ...sectionData } = dto;

    const section = await this.prisma.roadmapSection.create({
      data: {
        ...sectionData,
        categories: categories
          ? {
              create: categories.map((cat) => ({
                key: cat.key,
                sortOrder: cat.sortOrder ?? 0,
                items: cat.items
                  ? {
                      create: cat.items.map((item) => ({
                        key: item.key,
                        iconUrl: item.iconUrl,
                        iconAlt: item.iconAlt,
                        sortOrder: item.sortOrder ?? 0,
                        links: item.links
                          ? {
                              create: item.links.map((link) => ({
                                label: link.label,
                                url: link.url,
                                type: link.type,
                                sortOrder: link.sortOrder ?? 0,
                              })),
                            }
                          : undefined,
                      })),
                    }
                  : undefined,
              })),
            }
          : undefined,
      },
      include: {
        categories: {
          include: {
            items: {
              include: { links: true },
            },
          },
        },
      },
    });

    await this.invalidateCache();
    return section;
  }

  async updateSection(id: string, dto: UpdateRoadmapSectionDto) {
    const existing = await this.prisma.roadmapSection.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('Section not found');

    const { categories, ...sectionData } = dto;

    const section = await this.prisma.roadmapSection.update({
      where: { id },
      data: sectionData,
      include: {
        categories: {
          include: {
            items: {
              include: { links: true },
            },
          },
        },
      },
    });

    await this.invalidateCache();
    return section;
  }

  async deleteSection(id: string) {
    const existing = await this.prisma.roadmapSection.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('Section not found');

    await this.prisma.roadmapSection.delete({ where: { id } });
    await this.invalidateCache();
    return { success: true };
  }

  private async invalidateCache() {
    await this.redis.delByPattern('roadmap:*');
  }
}
