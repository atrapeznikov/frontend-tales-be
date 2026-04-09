import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateArticleDto, CreateTagDto, TranslationDto } from './create-article.dto.js';
import { IsArray, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateArticleDto extends PartialType(OmitType(CreateArticleDto, ['translations'] as const)) {
  @ApiPropertyOptional({ type: [TranslationDto], description: 'Article translations' })
  @ValidateNested({ each: true })
  @Type(() => TranslationDto)
  @IsArray()
  @IsOptional()
  translations?: TranslationDto[];
}

export class UpdateTagDto extends PartialType(CreateTagDto) {}
