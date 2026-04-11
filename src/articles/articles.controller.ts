import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ArticlesService } from './articles.service.js';
import { CreateArticleDto, CreateTagDto } from './dto/create-article.dto.js';
import { UpdateArticleDto, UpdateTagDto } from './dto/update-article.dto.js';
import { ArticleFilterDto } from './dto/article-filter.dto.js';
import { Public, Roles, CurrentUser } from '../common/decorators/index.js';

@ApiTags('Articles')
@Controller('articles')
export class ArticlesController {
  constructor(private readonly articlesService: ArticlesService) {}

  // ─── Tags ─────────────────────────────────────────────────────────────

  @Get('tags')
  @Public()
  @ApiOperation({ summary: 'Get all tags' })
  findAllTags() {
    return this.articlesService.findAllTags();
  }

  @Post('tags')
  @ApiBearerAuth()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Create a new tag (Admin)' })
  createTag(@Body() dto: CreateTagDto) {
    return this.articlesService.createTag(dto);
  }

  @Patch('tags/:id')
  @ApiBearerAuth()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Update a tag (Admin)' })
  updateTag(@Param('id') id: string, @Body() dto: UpdateTagDto) {
    return this.articlesService.updateTag(id, dto);
  }

  @Delete('tags/:id')
  @ApiBearerAuth()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Delete a tag (Admin)' })
  deleteTag(@Param('id') id: string) {
    return this.articlesService.deleteTag(id);
  }

  // ─── Articles ─────────────────────────────────────────────────────────

  @Post()
  @ApiBearerAuth()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Create a new article with translations (Admin)' })
  create(@Body() dto: CreateArticleDto) {
    return this.articlesService.create(dto);
  }

  @Get()
  @Public()
  @ApiOperation({ summary: 'Get all articles with pagination and filters' })
  findAll(@Query() filter: ArticleFilterDto, @CurrentUser() user: any) {
    const isAdmin = user?.role === 'ADMIN';
    return this.articlesService.findAll(filter, isAdmin);
  }

  @Get(':slug')
  @Public()
  @ApiOperation({ summary: 'Get article by slug' })
  @ApiQuery({ name: 'language', required: false, description: 'Language code (en or ru)' })
  findBySlug(
    @Param('slug') slug: string,
    @Query('language') language: string,
    @CurrentUser() user: any,
  ) {
    const isAdmin = user?.role === 'ADMIN';
    return this.articlesService.findBySlug(slug, isAdmin, language);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Update article with translations (Admin)' })
  update(@Param('id') id: string, @Body() dto: UpdateArticleDto) {
    return this.articlesService.update(id, dto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Delete article (Admin)' })
  delete(@Param('id') id: string) {
    return this.articlesService.delete(id);
  }

  @Post(':slug/view')
  @Public()
  @ApiOperation({ summary: 'Increment view count for an article' })
  incrementViewCount(
    @Param('slug') slug: string,
    @Req() req: any,
  ) {
    const ip: string = req.ip ?? req.socket?.remoteAddress ?? 'unknown';
    return this.articlesService.incrementViewCount(slug, ip);
  }
}
