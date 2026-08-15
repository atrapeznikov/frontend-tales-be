import { Test, TestingModule } from '@nestjs/testing';
import { BooksController } from './books.controller.js';
import { BooksService } from './books.service.js';
import { BookFilterDto } from './dto/book-filter.dto.js';

describe('BooksController', () => {
  let controller: BooksController;

  const mockBooksService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    findAllTags: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BooksController],
      providers: [{ provide: BooksService, useValue: mockBooksService }],
    }).compile();

    controller = module.get<BooksController>(BooksController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAllTags', () => {
    it('should return all tags', async () => {
      const tags = ['algo', 'js'];
      mockBooksService.findAllTags.mockResolvedValue(tags);

      const result = await controller.findAllTags();

      expect(result).toBe(tags);
      expect(mockBooksService.findAllTags).toHaveBeenCalledWith();
    });
  });

  describe('findAll', () => {
    it('should call service.findAll with the filter', async () => {
      const filter: BookFilterDto = { site_lang: 'ru' };
      const response = { data: [], meta: {} };
      mockBooksService.findAll.mockResolvedValue(response);

      const result = await controller.findAll(filter);

      expect(mockBooksService.findAll).toHaveBeenCalledWith(filter);
      expect(result).toBe(response);
    });
  });

  describe('findOne', () => {
    it('should call service.findOne with the id', async () => {
      const book = { id: 'b1' };
      mockBooksService.findOne.mockResolvedValue(book);

      const result = await controller.findOne('b1');

      expect(mockBooksService.findOne).toHaveBeenCalledWith('b1');
      expect(result).toBe(book);
    });
  });
});
