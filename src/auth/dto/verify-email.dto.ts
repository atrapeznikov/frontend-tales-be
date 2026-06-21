import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/** Query params for `GET /auth/verify-email?token=...`. */
export class VerifyEmailDto {
  @ApiProperty({
    description: 'Signed email-verification token from the email link',
  })
  @IsString()
  @IsNotEmpty()
  token!: string;
}
