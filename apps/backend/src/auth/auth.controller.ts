import {
  Controller,
  Post,
  Body,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
  Get,
  Patch,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  async login(@Body() dto: LoginDto, @Req() req: Request) {
    return this.authService.login(dto, {
      ip: req.ip ?? 'unknown',
      userAgent: req.headers['user-agent'] ?? 'unknown',
    });
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  async refresh(@Body() dto: RefreshTokenDto, @Req() req: Request) {
    return this.authService.refreshToken(dto, {
      ip: req.ip ?? 'unknown',
      userAgent: req.headers['user-agent'] ?? 'unknown',
    });
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Logout current session' })
  async logout(@Body() dto: RefreshTokenDto, @CurrentUser() user: any) {
    await this.authService.logout(user.id, dto.refreshToken);
  }

  @Post('logout-all')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Logout all sessions' })
  async logoutAll(@CurrentUser() user: any) {
    await this.authService.logoutAll(user.id);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  async me(@CurrentUser() user: any) {
    return user;
  }

  @Patch('change-password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Change current user password' })
  async changePassword(
    @CurrentUser() user: any,
    @Body() dto: { currentPassword: string; newPassword: string },
  ) {
    if (!dto.currentPassword || !dto.newPassword) {
      throw new BadRequestException('currentPassword and newPassword are required');
    }
    if (dto.newPassword.length < 8) {
      throw new BadRequestException('New password must be at least 8 characters');
    }
    await this.authService.changePassword(user.id, dto.currentPassword, dto.newPassword);
  }

  @Post('set-password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Set password on first login (mustChangePassword flow)' })
  async setPassword(@CurrentUser() user: any, @Body() dto: { newPassword: string }) {
    if (!dto.newPassword || dto.newPassword.length < 8) {
      throw new BadRequestException('Mínimo 8 caracteres');
    }
    await this.authService.setPassword(user.id, dto.newPassword);
  }

  @Get('hub-sso')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'SSO desde ImpulsoDent Hub — intercambia hub_token por tokens de sesión' })
  async hubSso(
    @Query('hub_token') hubToken: string,
    @Req() req: Request,
  ) {
    if (!hubToken) throw new BadRequestException('hub_token requerido');
    return this.authService.hubSsoLogin(hubToken, {
      ip: (req as any).ip ?? 'unknown',
      userAgent: (req as any).headers['user-agent'] ?? 'unknown',
    });
  }
}
