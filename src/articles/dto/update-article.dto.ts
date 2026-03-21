import { PartialType } from '@nestjs/swagger';
import { CreateArticleDto, CreateTagDto } from './create-article.dto.js';

export class UpdateArticleDto extends PartialType(CreateArticleDto) {}
export class UpdateTagDto extends PartialType(CreateTagDto) {}
