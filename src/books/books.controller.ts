import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { BooksService } from './books.service.js';
import { BookFilterDto } from './dto/book-filter.dto.js';
import { Public } from '../common/decorators/index.js';

@ApiTags('Books')
@Controller('books')
export class BooksController {
  constructor(private readonly booksService: BooksService) {}

  @Get('tags')
  @Public()
  @ApiOperation({ summary: 'Get all available book tags' })
  findAllTags() {
    return this.booksService.findAllTags();
  }

  @Get()
  @Public()
  @ApiOperation({
    summary: 'Get list of books with filtering, search and pagination',
  })
  findAll(@Query() filter: BookFilterDto) {
    return this.booksService.findAll(filter);
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get book details by id' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.booksService.findOne(id);
  }
}
