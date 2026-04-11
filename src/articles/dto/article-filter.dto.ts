import { IsOptional, IsString, IsEnum, IsInt, Min, Max, IsIn } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ContentStatus } from './create-article.dto.js';
import { Type } from 'class-transformer';

export class ArticleFilterDto {
  @ApiPropertyOptional({ description: 'Language code (en or ru)', example: 'ru' })
  @IsString()
  @IsIn(['en', 'ru'])
  @IsOptional()
  language?: string;

  @ApiPropertyOptional({ description: 'Filter by tag slug' })
  @IsString()
  @IsOptional()
  tag?: string;

  @ApiPropertyOptional({ enum: ContentStatus, description: 'Filter by published status' })
  @IsEnum(ContentStatus)
  @IsOptional()
  status?: ContentStatus;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items per page', default: 10 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number = 10;
}
