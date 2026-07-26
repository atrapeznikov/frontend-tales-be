import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsInt,
  Min,
  Max,
  IsArray,
  IsUrl,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BookLanguage, BookStatus } from '@prisma/client';

export class CreateBookDto {
  @ApiProperty({ example: 'Designing Data-Intensive Applications' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: 'Martin Kleppmann' })
  @IsString()
  @IsNotEmpty()
  author: string;

  @ApiPropertyOptional({ description: 'Book description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    example: 'https://cdn.site.com/covers/ddia.jpg',
    description: 'Cover image URL (S3)',
  })
  @IsUrl()
  @IsOptional()
  coverUrl?: string;

  @ApiProperty({ enum: BookLanguage, description: 'Book language' })
  @IsEnum(BookLanguage)
  language: BookLanguage;

  @ApiPropertyOptional({ enum: BookStatus, default: BookStatus.RECOMMENDED })
  @IsEnum(BookStatus)
  @IsOptional()
  status?: BookStatus;

  @ApiPropertyOptional({
    description: 'Numeric rating from 1 to 5',
    minimum: 1,
    maximum: 5,
  })
  @IsInt()
  @Min(1)
  @Max(5)
  @IsOptional()
  rating?: number;

  @ApiPropertyOptional({
    description: 'Full review text (HTML/Markdown supported)',
  })
  @IsString()
  @IsOptional()
  reviewText?: string;

  @ApiPropertyOptional({ type: [String], description: 'Tags/genres' })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @ApiPropertyOptional({
    type: [String],
    description: 'Links where the book can be purchased',
  })
  @IsArray()
  @IsUrl({}, { each: true })
  @IsOptional()
  purchaseLinks?: string[];
}
