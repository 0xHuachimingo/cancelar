import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module';
import { AppThrottlerGuard } from './common/app-throttler.guard';
import { CatalogController } from './catalog/catalog.controller';
import { ClientsModule } from './clients/clients.module';
import { validateEnv } from './config/env';
import { DashboardModule } from './dashboard/dashboard.module';
import { EquipmentModule } from './equipment/equipment.module';
import { HealthController } from './health/health.controller';
import { OrdersModule } from './orders/orders.module';
import { PrismaModule } from './prisma/prisma.module';
import { SetupModule } from './setup/setup.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    // Límite general: 600 requests/min por IP. Holgado a propósito: en un taller varias PCs comparten
    // la IP pública y el frontend precarga datos. El login tiene su propio límite (por IP + email).
    // «ip» cuenta solo por IP, sin importar el email: frena a quien prueba una contraseña contra muchas
    // cuentas. Fuera del login el límite es inalcanzable (cada ruta lo ajusta con @Throttle).
    ThrottlerModule.forRoot([
      { ttl: 60_000, limit: 600 },
      { name: 'ip', ttl: 60_000, limit: 1_000_000, getTracker: (req: Record<string, unknown>) => (typeof req.ip === 'string' ? req.ip : 'sin-ip') },
    ]),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    ClientsModule,
    EquipmentModule,
    OrdersModule,
    DashboardModule,
    SetupModule,
  ],
  controllers: [HealthController, CatalogController],
  // El ThrottlerGuard va antes que el AuthGuard (registrado en AuthModule)
  providers: [{ provide: APP_GUARD, useClass: AppThrottlerGuard }],
})
export class AppModule {}
