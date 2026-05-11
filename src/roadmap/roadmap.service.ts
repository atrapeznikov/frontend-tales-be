import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { RedisService } from '../redis/redis.service.js';
import { CreateRoadmapSectionDto } from './dto/create-roadmap.dto.js';
import { UpdateRoadmapSectionDto } from './dto/update-roadmap.dto.js';

const CACHE_TTL = 600;

const fullInclude = {
  translations: true,
  categories: {
    orderBy: { sortOrder: 'asc' as const },
    include: {
      translations: true,
      items: {
        orderBy: { sortOrder: 'asc' as const },
        include: {
          translations: true,
          links: {
            orderBy: { sortOrder: 'asc' as const },
          },
        },
      },
    },
  },
};

@Injectable()
export class RoadmapService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async findAll(isAdmin: boolean = false) {
    const cacheKey = `roadmap:full:admin_${isAdmin}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const where: any = {};
    if (!isAdmin) {
      where.status = 'PUBLISHED';
    }

    const sections = await this.prisma.roadmapSection.findMany({
      where,
      orderBy: { sortOrder: 'asc' },
      include: fullInclude,
    });

    await this.redis.set(cacheKey, JSON.stringify(sections), CACHE_TTL);
    return sections;
  }

  async findSectionByKey(key: string, isAdmin: boolean = false) {
    const section = await this.prisma.roadmapSection.findUnique({
      where: { key },
      include: fullInclude,
    });

    if (!section) throw new NotFoundException('Section not found');
    if (!isAdmin && section.status !== 'PUBLISHED') {
      throw new NotFoundException('Section not found');
    }

    return section;
  }

  async createSection(dto: CreateRoadmapSectionDto) {
    const existing = await this.prisma.roadmapSection.findUnique({
      where: { key: dto.key },
    });
    if (existing) throw new ConflictException('Section key already exists');

    const { categories, translations, ...sectionData } = dto;

    const section = await this.prisma.roadmapSection.create({
      data: {
        ...sectionData,
        translations: translations
          ? {
              create: translations.map((t) => ({
                language: t.language,
                title: t.title,
              })),
            }
          : undefined,
        categories: categories
          ? {
              create: categories.map((cat) => ({
                key: cat.key,
                sortOrder: cat.sortOrder ?? 0,
                translations: cat.translations
                  ? {
                      create: cat.translations.map((t) => ({
                        language: t.language,
                        name: t.name,
                      })),
                    }
                  : undefined,
                items: cat.items
                  ? {
                      create: cat.items.map((item) => ({
                        key: item.key,
                        iconUrl: item.iconUrl,
                        iconAlt: item.iconAlt,
                        sortOrder: item.sortOrder ?? 0,
                        translations: item.translations
                          ? {
                              create: item.translations.map((t) => ({
                                language: t.language,
                                title: t.title,
                                description: t.description ?? '',
                              })),
                            }
                          : undefined,
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
      include: fullInclude,
    });

    await this.invalidateCache();
    return section;
  }

  async updateSection(id: string, dto: UpdateRoadmapSectionDto) {
    const existing = await this.prisma.roadmapSection.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('Section not found');

    const { categories, translations, ...sectionData } = dto;

    // To cleanly update the whole tree, delete existing nested records and recreate them
    await this.prisma.$transaction([
      this.prisma.roadmapCategory.deleteMany({ where: { sectionId: id } }),
      this.prisma.roadmapSectionTranslation.deleteMany({ where: { sectionId: id } }),
    ]);

    const section = await this.prisma.roadmapSection.update({
      where: { id },
      data: {
        ...sectionData,
        translations: translations
          ? {
              create: translations.map((t) => ({
                language: t.language,
                title: t.title,
              })),
            }
          : undefined,
        categories: categories
          ? {
              create: categories.map((cat) => ({
                key: cat.key,
                sortOrder: cat.sortOrder ?? 0,
                translations: cat.translations
                  ? {
                      create: cat.translations.map((t) => ({
                        language: t.language,
                        name: t.name,
                      })),
                    }
                  : undefined,
                items: cat.items
                  ? {
                      create: cat.items.map((item) => ({
                        key: item.key,
                        iconUrl: item.iconUrl,
                        iconAlt: item.iconAlt,
                        sortOrder: item.sortOrder ?? 0,
                        translations: item.translations
                          ? {
                              create: item.translations.map((t) => ({
                                language: t.language,
                                title: t.title,
                                description: t.description ?? '',
                              })),
                            }
                          : undefined,
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
      include: fullInclude,
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
