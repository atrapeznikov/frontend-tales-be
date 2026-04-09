import { IsString, IsNotEmpty, IsOptional, IsEnum, IsArray, IsUrl, ValidateNested, ArrayMinSize, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum ContentStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
}

export class CreateTagDto {
  @ApiProperty({ example: 'JavaScript', description: 'Tag display name' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'javascript', description: 'URL-friendly slug' })
  @IsString()
  @IsNotEmpty()
  slug: string;
}

export class TranslationDto {
  @ApiProperty({ example: 'en', description: 'Language code (en or ru)' })
  @IsString()
  @IsIn(['en', 'ru'])
  language: string;

  @ApiProperty({ example: 'How to use React', description: 'Article title' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: 'A brief introduction to React...', description: 'Short description for SEO and article lists' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ example: '# React \n\n React is...', description: 'Markdown content of the article' })
  @IsString()
  @IsNotEmpty()
  content: string;
}

export class CreateArticleDto {
  @ApiProperty({ example: 'how-to-use-react', description: 'URL-friendly slug' })
  @IsString()
  @IsNotEmpty()
  slug: string;

  @ApiPropertyOptional({ example: 'https://example.com/cover.png', description: 'Cover image URL' })
  @IsUrl()
  @IsOptional()
  coverImageUrl?: string;

  @ApiPropertyOptional({ enum: ContentStatus, default: ContentStatus.DRAFT })
  @IsEnum(ContentStatus)
  @IsOptional()
  status?: ContentStatus;

  @ApiPropertyOptional({ type: [String], description: 'List of tag slugs' })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @ApiProperty({ type: [TranslationDto], description: 'Article translations (at least one)' })
  @ValidateNested({ each: true })
  @Type(() => TranslationDto)
  @IsArray()
  @ArrayMinSize(1)
  translations: TranslationDto[];
}
