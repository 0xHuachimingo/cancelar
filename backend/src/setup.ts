import { type INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { ApiExceptionFilter } from './common/filters/api-exception.filter';
import { origenPermitido } from './common/origin';
import type { Env } from './config/env';

/** Configuración común a main.ts y a los tests e2e. */
export function configureApp(app: INestApplication): void {
  const config = app.get(ConfigService<Env, true>);
  app.setGlobalPrefix('api');
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'same-site' } }));
  app.use(cookieParser());
  const origins = config.get('CORS_ORIGIN', { infer: true }).split(',').map((o) => o.trim()).filter(Boolean);
  app.enableCors({ origin: origins, credentials: true });
  app.use(origenPermitido(origins)); // CSRF: lo que modifica datos tiene que venir del frontend
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidUnknownValues: true }));
  app.useGlobalFilters(new ApiExceptionFilter(config.get('UPLOAD_MAX_MB', { infer: true })));
  app.enableShutdownHooks();
}
