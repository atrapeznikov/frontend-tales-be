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
        YANDEX_SCOPES: Joi.string().optional().allow(''),

        // Frontend
        FRONTEND_URL: Joi.string().default('http://localhost:3001'),

        // Backend
        BACKEND_URL: Joi.string().default('http://localhost:3000'),

        // Reverse-proxy trust (Express `trust proxy`). See main.ts. Use a value
        // that matches your real topology so X-Forwarded-For cannot be spoofed.
        TRUST_PROXY: Joi.string().default('loopback'),

        // Dedicated secret for signing admin quick-action (email link) tokens.
        // Keep separate from JWT_ACCESS_SECRET. If unset, the code falls back to
        // JWT_ACCESS_SECRET and logs a warning — set this in production.
        JWT_ACTION_SECRET: Joi.string().optional().allow(''),

        // Yandex SmartCaptcha (server-side verification)
        // Leave empty in local dev to skip verification.
        YANDEX_CAPTCHA_SECRET: Joi.string().optional().allow(''),
        // Explicit captcha enablement. When unset, captcha is required in every
        // environment except 'development'. Set to 'false' to force-disable.
        CAPTCHA_ENABLED: Joi.boolean().optional(),
        // Number of failed login attempts (per IP or email) after which the
        // login route starts demanding a captcha. 0 means "always require".
        // Keep in sync with the frontend's CAPTCHA_AFTER_ATTEMPTS.
        CAPTCHA_AFTER_FAILURES: Joi.number().min(0).default(3),

        // Email Configuration
        EMAIL_PROVIDER: Joi.string()
          .valid('smtp', 'console')
          .default('console'),
        SMTP_HOST: Joi.string().when('EMAIL_PROVIDER', {
          is: 'smtp',
          then: Joi.required(),
          otherwise: Joi.optional().allow(''),
        }),
        SMTP_PORT: Joi.number().default(587),
        SMTP_USER: Joi.string().optional().allow(''),
        SMTP_PASS: Joi.string().optional().allow(''),
        SMTP_SECURE: Joi.boolean().default(false),
        SMTP_FROM_EMAIL: Joi.string()
          .email()
          .default('noreply@frontendtales.com'),
        SMTP_FROM_NAME: Joi.string().default('Frontend Tales'),

        // S3 Configuration
        S3_ENDPOINT: Joi.string().default('https://s3.twcstorage.ru'),
        S3_REGION: Joi.string().default('ru-1'),
        S3_ACCESS_KEY_ID: Joi.string().optional().allow(''),
        S3_SECRET_ACCESS_KEY: Joi.string().optional().allow(''),
        S3_BUCKET: Joi.string().default('806c1391-211a9e5f-91c1-412a-b689-4740a680b06e'),
        AVATAR_DB_PREFIX: Joi.string().default('https://frontendtales.ru/assets/806c1391-211a9e5f-91c1-412a-b689-4740a680b06e/avatars/'),
      }),
    }),
  ],
})
export class ConfigModule {}
