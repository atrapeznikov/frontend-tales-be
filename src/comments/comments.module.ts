import { Module } from '@nestjs/common';
import { CommentsService } from './comments.service.js';
import { CommentsController } from './comments.controller.js';
import { EmailModule } from '../email/index.js';

@Module({
  imports: [EmailModule],
  controllers: [CommentsController],
  providers: [CommentsService],
  exports: [CommentsService],
})
export class CommentsModule {}
export { CommentsService };
