import { IsIn, IsOptional, IsString, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const ALLOWED_SORTS = [
  'created_at',
  '-created_at',
  'rating',
  '-rating',
] as const;

export class BookFilterDto {
  @ApiProperty({
    enum: ['ru', 'en'],
    description: 'Site interface language',
    example: 'ru',
  })
  @IsIn(['ru', 'en'])
  site_lang: 'ru' | 'en';

  @ApiPropertyOptional({
    enum: ['recommended', 'not_recommended'],
    description: 'Filter by recommendation status',
  })
  @IsIn(['recommended', 'not_recommended'])
  @IsOptional()
  status?: 'recommended' | 'not_recommended';

  @ApiPropertyOptional({ description: 'Filter by tag/genre' })
  @IsString()
  @IsOptional()
  tag?: string;

  @ApiPropertyOptional({ description: 'Search query (title and author)' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({
    enum: ALLOWED_SORTS,
    default: '-created_at',
    description: 'Sort order',
  })
  @IsIn(ALLOWED_SORTS)
  @IsOptional()
  sort?: (typeof ALLOWED_SORTS)[number] = '-created_at';

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number = 20;
}
