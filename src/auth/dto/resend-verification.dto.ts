import { IsEmail, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ResendVerificationDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email!: string;

  @ApiPropertyOptional({
    description: 'Language preference for the verification email',
    example: 'en',
    enum: ['en', 'ru'],
  })
  @IsOptional()
  @IsString()
  lang?: 'en' | 'ru';

  @ApiPropertyOptional({
    description:
      'Yandex SmartCaptcha token returned by the client widget. Required when YANDEX_CAPTCHA_SECRET is configured on the server.',
  })
  @IsOptional()
  @IsString()
  captchaToken?: string;
}
