import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { CommentsService } from './comments.service.js';
import {
  PaginationQueryDto,
  CreateCommentDto,
  CreateReplyDto,
  ToggleReactionDto,
} from './dto/comments.dto.js';
import { Public, Roles, CurrentUser } from '../common/decorators/index.js';

@ApiTags('Comments')
@Controller('articles/:articleId/comments')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Get paginated comments for an article' })
  @ApiParam({ name: 'articleId', description: 'Article UUID' })
  getComments(
    @Param('articleId') articleId: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.commentsService.getComments(articleId, query);
  }

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a top-level comment' })
  @ApiParam({ name: 'articleId', description: 'Article UUID' })
  createComment(
    @Param('articleId') articleId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateCommentDto,
  ) {
    return this.commentsService.createComment(articleId, userId, dto);
  }

  @Post(':commentId/replies')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a reply to a comment or another reply' })
  @ApiParam({ name: 'articleId', description: 'Article UUID' })
  @ApiParam({
    name: 'commentId',
    description: 'Comment or Reply UUID to reply to',
  })
  createReply(
    @Param('articleId') articleId: string,
    @Param('commentId') commentId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateReplyDto,
  ) {
    return this.commentsService.createReply(articleId, commentId, userId, dto);
  }

  @Post(':commentId/reactions')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Toggle a reaction on a comment or reply' })
  @ApiParam({ name: 'articleId', description: 'Article UUID' })
  @ApiParam({
    name: 'commentId',
    description: 'Comment or Reply UUID to react to',
  })
  toggleReaction(
    @Param('articleId') articleId: string,
    @Param('commentId') commentId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: ToggleReactionDto,
  ) {
    return this.commentsService.toggleReaction(
      articleId,
      commentId,
      userId,
      dto,
    );
  }

  @Delete(':commentId')
  @ApiBearerAuth()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Soft delete a comment or reply (Admin)' })
  @ApiParam({ name: 'articleId', description: 'Article UUID' })
  @ApiParam({
    name: 'commentId',
    description: 'Comment or Reply UUID to delete',
  })
  deleteComment(
    @Param('articleId') articleId: string,
    @Param('commentId') commentId: string,
  ) {
    return this.commentsService.deleteComment(articleId, commentId);
  }
}
