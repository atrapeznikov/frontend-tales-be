import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsInt,
  IsEnum,
  IsArray,
  IsUrl,
  ValidateNested,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ContentStatus } from '../../articles/dto/create-article.dto.js';

export class CreateRoadmapItemTranslationDto {
  @IsString()
  @IsNotEmpty()
  language: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;
}

export class CreateRoadmapCategoryTranslationDto {
  @IsString()
  @IsNotEmpty()
  language: string;

  @IsString()
  @IsNotEmpty()
  name: string;
}

export class CreateRoadmapSectionTranslationDto {
  @IsString()
  @IsNotEmpty()
  language: string;

  @IsString()
  @IsNotEmpty()
  title: string;
}

export class CreateRoadmapLinkDto {
  @ApiProperty({ example: 'MDN - HTML elements reference' })
  @IsString()
  @IsNotEmpty()
  label: string;

  @ApiProperty({
    example:
      'https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements',
  })
  @IsUrl()
  url: string;

  @ApiPropertyOptional({
    example: 'docs',
    description: 'Link type: article, video, docs, course',
  })
  @IsString()
  @IsOptional()
  type?: string;

  @ApiPropertyOptional({ example: 0 })
  @IsInt()
  @Min(0)
  @IsOptional()
  sortOrder?: number;
}

export class CreateRoadmapItemDto {
  @ApiProperty({ example: 'html-syntax' })
  @IsString()
  @IsNotEmpty()
  key: string;

  @ApiProperty({ example: 'https://example.com/icons/html.svg' })
  @IsUrl()
  iconUrl: string;

  @ApiProperty({ example: 'HTML5' })
  @IsString()
  @IsNotEmpty()
  iconAlt: string;

  @ApiPropertyOptional({ example: 0 })
  @IsInt()
  @Min(0)
  @IsOptional()
  sortOrder?: number;

  @ApiPropertyOptional({ type: [CreateRoadmapLinkDto] })
  @ValidateNested({ each: true })
  @Type(() => CreateRoadmapLinkDto)
  @IsArray()
  @IsOptional()
  links?: CreateRoadmapLinkDto[];

  @ApiPropertyOptional({ type: [CreateRoadmapItemTranslationDto] })
  @ValidateNested({ each: true })
  @Type(() => CreateRoadmapItemTranslationDto)
  @IsArray()
  @IsOptional()
  translations?: CreateRoadmapItemTranslationDto[];
}

export class CreateRoadmapCategoryDto {
  @ApiProperty({ example: 'html' })
  @IsString()
  key: string;

  @ApiPropertyOptional({ example: 0 })
  @IsInt()
  @Min(0)
  @IsOptional()
  sortOrder?: number;

  @ApiPropertyOptional({ type: [CreateRoadmapItemDto] })
  @ValidateNested({ each: true })
  @Type(() => CreateRoadmapItemDto)
  @IsArray()
  @IsOptional()
  items?: CreateRoadmapItemDto[];

  @ApiPropertyOptional({ type: [CreateRoadmapCategoryTranslationDto] })
  @ValidateNested({ each: true })
  @Type(() => CreateRoadmapCategoryTranslationDto)
  @IsArray()
  @IsOptional()
  translations?: CreateRoadmapCategoryTranslationDto[];
}

export class CreateRoadmapSectionDto {
  @ApiProperty({ example: 'fundamentals' })
  @IsString()
  @IsNotEmpty()
  key: string;

  @ApiPropertyOptional({ example: false })
  @IsBoolean()
  @IsOptional()
  isNew?: boolean;

  @ApiPropertyOptional({ enum: ContentStatus, default: ContentStatus.DRAFT })
  @IsEnum(ContentStatus)
  @IsOptional()
  status?: ContentStatus;

  @ApiPropertyOptional({ example: 0 })
  @IsInt()
  @Min(0)
  @IsOptional()
  sortOrder?: number;

  @ApiPropertyOptional({ type: [CreateRoadmapCategoryDto] })
  @ValidateNested({ each: true })
  @Type(() => CreateRoadmapCategoryDto)
  @IsArray()
  @IsOptional()
  categories?: CreateRoadmapCategoryDto[];

  @ApiPropertyOptional({ type: [CreateRoadmapSectionTranslationDto] })
  @ValidateNested({ each: true })
  @Type(() => CreateRoadmapSectionTranslationDto)
  @IsArray()
  @IsOptional()
  translations?: CreateRoadmapSectionTranslationDto[];
}
