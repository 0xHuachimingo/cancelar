import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Env } from '../config/env';
import { EvidenceStorage } from './evidence.storage';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

@Module({
  imports: [
    // En memoria: el archivo se escribe a disco recién después de validar permisos
    MulterModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        storage: memoryStorage(),
        limits: { fileSize: config.get('UPLOAD_MAX_MB', { infer: true }) * 1024 * 1024, files: 1 },
      }),
    }),
  ],
  controllers: [OrdersController],
  providers: [OrdersService, EvidenceStorage],
  exports: [OrdersService],
})
export class OrdersModule {}
