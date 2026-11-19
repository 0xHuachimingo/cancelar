import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser, RequirePermission, type AuthUser } from '../auth/auth.decorators';
import { ClientsQuery, CreateClientDto } from './clients.dto';
import { ClientsService } from './clients.service';

@ApiTags('clientes')
@Controller('clients')
export class ClientsController {
  constructor(private readonly clients: ClientsService) {}

  /** GET /clients?q= — búsqueda por nombre, email o teléfono. */
  @Get()
  list(@CurrentUser() user: AuthUser, @Query() query: ClientsQuery) {
    return this.clients.list(user.tallerId, query.q);
  }

  /** POST /clients — 409 si el teléfono ya existe (con cualquier formato). */
  @Post()
  @RequirePermission('client.create')
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateClientDto) {
    return this.clients.create(user.tallerId, dto);
  }
}
