import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters';
import { TransformInterceptor } from './common/interceptors';

/**
 * Resolves the Express `trust proxy` setting from the TRUST_PROXY env var.
 * Accepts a number of hops, a boolean, or a comma-separated list of
 * trusted addresses/subnets. Defaults to 'loopback'.
 */
function parseTrustProxy(
  configService: ConfigService,
): boolean | number | string | string[] {
  const raw = configService.get<string>('TRUST_PROXY', 'loopback').trim();

  if (raw === 'true') return true;
  if (raw === 'false') return false;

  const asNumber = Number(raw);
  if (raw !== '' && Number.isInteger(asNumber)) return asNumber;

  if (raw.includes(',')) {
    return raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }

  return raw || 'loopback';
}

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  // Security headers
  app.use(helmet());

  // Cookie parser (for refresh token in httpOnly cookie)
  app.use(cookieParser());

  // Trust proxy configuration for correct client IP resolution (req.ip).
  //
  // SECURITY: a too-permissive setting lets clients spoof X-Forwarded-For and
  // defeat IP-based login rate limiting. Configure TRUST_PROXY to match your
  // actual topology rather than blindly trusting the last hop:
  //   - 'loopback'        (default) trust only proxies on localhost, e.g.
  //                       nginx running on the same host — XFF from external
  //                       clients is ignored.
  //   - a number          trust N hops (only if you control exactly N proxies).
  //   - a comma list/CIDR  e.g. '10.0.0.0/8,127.0.0.1' for off-host proxies.
  //   - 'false'           don't trust any proxy (direct exposure).
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.set('trust proxy', parseTrustProxy(configService));

  // Global prefix
  app.setGlobalPrefix('api');

  // CORS
  app.enableCors({
    origin: configService.get<string>('FRONTEND_URL'),
    credentials: true,
  });

  // Global pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Global filters
  app.useGlobalFilters(new HttpExceptionFilter());

  // Global interceptors
  app.useGlobalInterceptors(new TransformInterceptor());

  // Swagger (disabled in production)
  if (configService.get<string>('NODE_ENV') === 'development') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Frontend Tales API')
      .setDescription('Educational blog platform API')
      .setVersion('1.0')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document);
  }

  // Start
  const port = configService.get<number>('PORT', 3000);
  await app.listen(port);
  logger.log(`🚀 Application running on http://localhost:${port}`);
  logger.log(`📚 Swagger docs at http://localhost:${port}/api/docs`);
}

bootstrap();
