import { Body, Controller, Get, HttpCode, Post, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { CookieOptions, Response } from 'express';
import type { Env } from '../config/env';
import { CurrentUser, Public, type AuthUser } from './auth.decorators';
import { SESSION_COOKIE } from './auth.guard';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto, RegisterDto } from '../setup/setup.dto';

/** Intentos de login por minuto desde una misma IP, sumando todas las cuentas. */
export const LOGIN_POR_IP = 20;

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  private cookieOptions(): CookieOptions {
    return {
      httpOnly: true,
      sameSite: 'lax',
      secure: this.config.get('COOKIE_SECURE', { infer: true }),
      path: '/',
      maxAge: this.config.get('JWT_EXPIRES_IN', { infer: true }) * 1000,
    };
  }

  /** Inicia sesión: setea la cookie HTTP-only con el JWT. Máx. 5 intentos por minuto por cuenta y 20 por IP. */
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 }, ip: { limit: LOGIN_POR_IP, ttl: 60_000 } })
  @Post('login')
  @HttpCode(200)
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const { token, user } = await this.auth.login(dto.email, dto.password);
    res.cookie(SESSION_COOKIE, token, this.cookieOptions());
    return user;
  }

  /** Crea la primera cuenta y el taller, y deja la sesión iniciada. 409 si ya existe una. */
  @Public()
  // Por IP: alcanza para registrar los talleres de una red sin habilitar registros masivos
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('register')
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    const { token, user } = await this.auth.register(dto);
    res.cookie(SESSION_COOKIE, token, this.cookieOptions());
    return user;
  }

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('password')
  @HttpCode(204)
  async changePassword(@CurrentUser() user: AuthUser, @Body() dto: ChangePasswordDto, @Res({ passthrough: true }) res: Response): Promise<void> {
    // Las demás sesiones de la persona se cierran; esta sigue con un token nuevo
    res.cookie(SESSION_COOKIE, await this.auth.changePassword(user.id, dto), this.cookieOptions());
  }

  @Public()
  @Post('logout')
  @HttpCode(204)
  logout(@Res({ passthrough: true }) res: Response): void {
    const { maxAge: _maxAge, ...opts } = this.cookieOptions();
    res.clearCookie(SESSION_COOKIE, opts);
  }

  @Get('me')
  me(@CurrentUser() user: AuthUser): AuthUser {
    return user;
  }
}
