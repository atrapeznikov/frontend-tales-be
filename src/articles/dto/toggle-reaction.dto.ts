import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ArticleReactionType } from '@prisma/client';

export class ToggleArticleReactionDto {
  @ApiProperty({ enum: ArticleReactionType, description: 'Reaction emoji type' })
  @IsEnum(ArticleReactionType)
  type: ArticleReactionType;
}
