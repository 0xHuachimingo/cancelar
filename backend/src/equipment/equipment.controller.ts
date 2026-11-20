import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser, RequirePermission, type AuthUser } from '../auth/auth.decorators';
import { OrdersService } from '../orders/orders.service';
import { CreateEquipmentDto, EquipmentQuery } from './equipment.dto';
import { EquipmentService } from './equipment.service';

@ApiTags('equipos')
@Controller('equipment')
export class EquipmentController {
  constructor(
    private readonly equipment: EquipmentService,
    private readonly orders: OrdersService,
  ) {}

  /** GET /equipment?q=&clientId= */
  @Get()
  list(@CurrentUser() user: AuthUser, @Query() query: EquipmentQuery) {
    return this.equipment.list(user.tallerId, query);
  }

  /** POST /equipment — 409 si el número de serie ya existe. */
  @Post()
  @RequirePermission('equipment.create')
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateEquipmentDto) {
    return this.equipment.create(user.tallerId, dto);
  }

  /** GET /equipment/:id/orders — historial de órdenes del equipo (visibles para el usuario). */
  @Get(':id/orders')
  equipmentOrders(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.orders.listByEquipment(user, id);
  }
}
