import { Test, TestingModule } from '@nestjs/testing';
import { AdminBooksController } from './admin-books.controller.js';
import { BooksService } from './books.service.js';
import { CreateBookDto } from './dto/create-book.dto.js';
import { UpdateBookDto } from './dto/update-book.dto.js';

describe('AdminBooksController', () => {
  let controller: AdminBooksController;

  const mockBooksService = {
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminBooksController],
      providers: [{ provide: BooksService, useValue: mockBooksService }],
    }).compile();

    controller = module.get<AdminBooksController>(AdminBooksController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should call service.create with the dto', async () => {
      const dto: CreateBookDto = {
        title: 'Title',
        author: 'Author',
        language: 'EN' as any,
      };
      const created = { id: 'b1' };
      mockBooksService.create.mockResolvedValue(created);

      const result = await controller.create(dto);

      expect(mockBooksService.create).toHaveBeenCalledWith(dto);
      expect(result).toBe(created);
    });
  });

  describe('update', () => {
    it('should call service.update with id and dto', async () => {
      const dto: UpdateBookDto = { rating: 4 };
      const updated = { id: 'b1', rating: 4 };
      mockBooksService.update.mockResolvedValue(updated);

      const result = await controller.update('b1', dto);

      expect(mockBooksService.update).toHaveBeenCalledWith('b1', dto);
      expect(result).toBe(updated);
    });
  });

  describe('delete', () => {
    it('should call service.delete with id', async () => {
      mockBooksService.delete.mockResolvedValue({ success: true });

      const result = await controller.delete('b1');

      expect(mockBooksService.delete).toHaveBeenCalledWith('b1');
      expect(result).toEqual({ success: true });
    });
  });
});
