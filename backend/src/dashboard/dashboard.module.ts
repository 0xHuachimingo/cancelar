import { Module } from '@nestjs/common';
import { OrdersModule } from '../orders/orders.module';
import { SetupModule } from '../setup/setup.module';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [OrdersModule, SetupModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
