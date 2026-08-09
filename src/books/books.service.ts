import { Injectable, NotFoundException } from '@nestjs/common';
import { Book, BookLanguage, BookStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { BookFilterDto } from './dto/book-filter.dto.js';
import { CreateBookDto } from './dto/create-book.dto.js';
import { UpdateBookDto } from './dto/update-book.dto.js';

@Injectable()
export class BooksService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateBookDto) {
    const book = await this.prisma.book.create({ data: dto });
    return this.toDetail(book);
  }

  async update(id: string, dto: UpdateBookDto) {
    const existing = await this.prisma.book.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Book not found');

    const updated = await this.prisma.book.update({
      where: { id },
      data: dto,
    });
    return this.toDetail(updated);
  }

  async delete(id: string) {
    const existing = await this.prisma.book.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Book not found');

    await this.prisma.book.delete({ where: { id } });
    return { success: true };
  }

  async findAll(filter: BookFilterDto) {
    const {
      site_lang,
      status,
      tag,
      search,
      sort = '-created_at',
      page = 1,
      limit = 20,
    } = filter;

    const where: Prisma.BookWhereInput = {
      language:
        site_lang === 'ru'
          ? { in: [BookLanguage.RU, BookLanguage.EN] }
          : BookLanguage.EN,
    };

    if (status) {
      where.status = status.toUpperCase() as BookStatus;
    }

    if (tag) {
      where.tags = { has: tag };
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { author: { contains: search, mode: 'insensitive' } },
      ];
    }

    const descending = sort.startsWith('-');
    const sortField = descending ? sort.slice(1) : sort;
    const orderBy: Prisma.BookOrderByWithRelationInput =
      sortField === 'rating'
        ? { rating: descending ? 'desc' : 'asc' }
        : { createdAt: descending ? 'desc' : 'asc' };

    const [items, total] = await Promise.all([
      this.prisma.book.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.book.count({ where }),
    ]);

    return {
      data: items.map((book) => this.toListItem(book)),
      meta: {
        current_page: page,
        total_pages: total === 0 ? 0 : Math.ceil(total / limit),
        total_items: total,
      },
    };
  }

  async findOne(id: string) {
    const book = await this.prisma.book.findUnique({ where: { id } });
    if (!book) throw new NotFoundException('Book not found');

    return this.toDetail(book);
  }

  async findAllTags(): Promise<string[]> {
    const books = await this.prisma.book.findMany({ select: { tags: true } });

    const unique = new Set<string>();
    for (const book of books) {
      for (const t of book.tags) unique.add(t);
    }

    return Array.from(unique).sort();
  }

  private toListItem(book: Book) {
    return {
      id: book.id,
      title: book.title,
      author: book.author,
      cover_url: book.coverUrl,
      description: book.description,
      language: book.language.toLowerCase(),
      status: book.status.toLowerCase(),
      rating: book.rating,
      tags: book.tags,
      created_at: book.createdAt,
      purchase_links: book.purchaseLinks,
    };
  }

  private toDetail(book: Book) {
    return {
      ...this.toListItem(book),
      review_text: book.reviewText,
      updated_at: book.updatedAt,
    };
  }
}
