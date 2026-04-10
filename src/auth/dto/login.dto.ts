import { IsEmail, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'securePassword123' })
  @IsString()
  password!: string;

  @ApiPropertyOptional({
    description:
      'Yandex SmartCaptcha token returned by the client widget. Required when YANDEX_CAPTCHA_SECRET is configured on the server.',
  })
  @IsOptional()
  @IsString()
  captchaToken?: string;
}
