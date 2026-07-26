import { Module } from '@nestjs/common';
import { BooksService } from './books.service.js';
import { BooksController } from './books.controller.js';
import { AdminBooksController } from './admin-books.controller.js';

@Module({
  controllers: [BooksController, AdminBooksController],
  providers: [BooksService],
  exports: [BooksService],
})
export class BooksModule {}
