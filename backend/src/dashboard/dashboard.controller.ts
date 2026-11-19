import { Controller, Get, HttpCode, Param, Patch } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser, RequirePermission, type AuthUser } from '../auth/auth.decorators';
import { DashboardService } from './dashboard.service';

@ApiTags('dashboard y alertas')
@Controller()
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  /** GET /dashboard — métricas, informes críticos y órdenes recientes. */
  @Get('dashboard')
  get(@CurrentUser() user: AuthUser) {
    return this.dashboard.dashboard(user);
  }

  /** GET /alerts — críticas, bloqueadas y escaladas abiertas. */
  @Get('alerts')
  @RequirePermission('nav.alertas')
  alerts(@CurrentUser() user: AuthUser) {
    return this.dashboard.alerts(user);
  }

  @Patch('critical-reports/:id/read')
  @HttpCode(204)
  markRead(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.dashboard.markRead(user, id);
  }
}
