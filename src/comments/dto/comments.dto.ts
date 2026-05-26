import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsUUID,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ReactionType } from '@prisma/client';

export class PaginationQueryDto {
  @ApiPropertyOptional({
    description:
      'Cursor (UUID of the comment) for pagination. Next comments will be fetched after this cursor.',
  })
  @IsUUID()
  @IsOptional()
  cursor?: string;
}

export class CreateCommentDto {
  @ApiProperty({
    description: 'Content of the comment',
    example: 'This is a great article!',
  })
  @IsString()
  @IsNotEmpty()
  content: string;
}

export class CreateReplyDto {
  @ApiProperty({
    description: 'Content of the reply',
    example: 'I totally agree with you.',
  })
  @IsString()
  @IsNotEmpty()
  content: string;
}

export class ToggleReactionDto {
  @ApiProperty({
    description: 'Type of reaction',
    enum: ReactionType,
    example: 'LIKE',
  })
  @IsEnum(ReactionType)
  @IsNotEmpty()
  type: ReactionType;
}
