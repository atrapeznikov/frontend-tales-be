import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import * as Joi from 'joi';

@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `.env`,
      validationSchema: Joi.object({
        // Application
        PORT: Joi.number().default(3000),
        NODE_ENV: Joi.string()
          .valid('development', 'production', 'test')
          .default('development'),

        // Database
        DATABASE_URL: Joi.string().required(),

        // Redis
        REDIS_HOST: Joi.string().default('localhost'),
        REDIS_PORT: Joi.number().default(6379),
        REDIS_PASSWORD: Joi.string().required(),

        // JWT
        JWT_ACCESS_SECRET: Joi.string().required(),
        JWT_ACCESS_EXPIRES_IN: Joi.string().default('15m'),
        JWT_REFRESH_SECRET: Joi.string().required(),
        JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),

        // OAuth: Google
        GOOGLE_CLIENT_ID: Joi.string().optional().allow(''),
        GOOGLE_CLIENT_SECRET: Joi.string().optional().allow(''),
        GOOGLE_CALLBACK_URL: Joi.string().optional().allow(''),

        // OAuth: GitHub
        GITHUB_CLIENT_ID: Joi.string().optional().allow(''),
        GITHUB_CLIENT_SECRET: Joi.string().optional().allow(''),
        GITHUB_CALLBACK_URL: Joi.string().optional().allow(''),

        // OAuth: Yandex
        YANDEX_CLIENT_ID: Joi.string().optional().allow(''),
        YANDEX_CLIENT_SECRET: Joi.string().optional().allow(''),
        YANDEX_CALLBACK_URL: Joi.string().optional().allow(''),

        // Frontend
        FRONTEND_URL: Joi.string().default('http://localhost:3001'),

        // Yandex SmartCaptcha (server-side verification)
        // Leave empty in local dev to skip verification.
        YANDEX_CAPTCHA_SECRET: Joi.string().optional().allow(''),
      }),
    }),
  ],
})
export class ConfigModule {}
