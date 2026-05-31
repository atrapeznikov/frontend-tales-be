import { IsString, MinLength, MaxLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SetupNicknameDto {
  @ApiProperty({ example: 'johndoe' })
  @IsString()
  @MinLength(2)
  @MaxLength(30)
  @Matches(/^[a-zA-Z0-9_]+$/, {
    message: 'Nickname must contain only letters, numbers, and underscores',
  })
  nickname!: string;
}
