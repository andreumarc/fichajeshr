import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import * as bcrypt from 'bcryptjs';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { AuditAction } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MINUTES = 15;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private config: ConfigService,
    private auditService: AuditService,
  ) {}

  async login(dto: LoginDto, meta: { ip: string; userAgent: string }) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { company: true, employee: { include: { workCenter: true } } },
    });

    if (!user) {
      await this.auditService.log({
        action: AuditAction.LOGIN_FAILED,
        entityType: 'User',
        ipAddress: meta.ip,
        userAgent: meta.userAgent,
        description: `Login failed: email not found (${dto.email})`,
      });
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // Check if account is locked
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new ForbiddenException(
        `Cuenta bloqueada hasta ${user.lockedUntil.toISOString()}. Demasiados intentos fallidos.`,
      );
    }

    if (!user.isActive) {
      throw new ForbiddenException('Cuenta desactivada');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);

    if (!isPasswordValid) {
      const attempts = user.loginAttempts + 1;
      const lockData: any = { loginAttempts: attempts };
      if (attempts >= MAX_FAILED_ATTEMPTS) {
        lockData.lockedUntil = new Date(Date.now() + LOCK_DURATION_MINUTES * 60 * 1000);
      }
      await this.prisma.user.update({ where: { id: user.id }, data: lockData });

      await this.auditService.log({
        action: AuditAction.LOGIN_FAILED,
        entityType: 'User',
        entityId: user.id,
        userId: user.id,
        companyId: user.companyId ?? undefined,
        ipAddress: meta.ip,
        userAgent: meta.userAgent,
        description: `Login failed: invalid password (attempt ${attempts})`,
      });
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // Reset failed attempts
    await this.prisma.user.update({
      where: { id: user.id },
      data: { loginAttempts: 0, lockedUntil: null, lastLogin: new Date() },
    });

    const tokens = await this.generateTokens(user);

    // Save session
    await this.prisma.userSession.create({
      data: {
        userId: user.id,
        refreshToken: tokens.refreshToken,
        ipAddress: meta.ip,
        userAgent: meta.userAgent,
        deviceInfo: dto.deviceInfo ?? null,
        expiresAt: new Date(
          Date.now() + this.parseExpiry(this.config.get('JWT_REFRESH_EXPIRES_IN', '7d')),
        ),
      },
    });

    await this.auditService.log({
      action: AuditAction.LOGIN,
      entityType: 'User',
      entityId: user.id,
      userId: user.id,
      companyId: user.companyId ?? undefined,
      ipAddress: meta.ip,
      userAgent: meta.userAgent,
      description: 'User logged in',
    });

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: this.sanitizeUser(user),
      mustChangePassword: user.mustChangePassword,
    };
  }

  async refreshToken(dto: RefreshTokenDto, meta: { ip: string; userAgent: string }) {
    const session = await this.prisma.userSession.findUnique({
      where: { refreshToken: dto.refreshToken },
      include: { user: { include: { company: true, employee: true } } },
    });

    if (!session || session.isRevoked || session.expiresAt < new Date()) {
      throw new UnauthorizedException('Sesión inválida o expirada');
    }

    // Rotate refresh token
    const tokens = await this.generateTokens(session.user);
    await this.prisma.userSession.update({
      where: { id: session.id },
      data: { refreshToken: tokens.refreshToken, isRevoked: false },
    });

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  async logout(userId: string, refreshToken: string) {
    await this.prisma.userSession.updateMany({
      where: { userId, refreshToken },
      data: { isRevoked: true },
    });

    await this.auditService.log({
      action: AuditAction.LOGOUT,
      entityType: 'User',
      entityId: userId,
      userId,
      description: 'User logged out',
    });
  }

  async logoutAll(userId: string) {
    await this.prisma.userSession.updateMany({
      where: { userId },
      data: { isRevoked: true },
    });
  }

  async validateUser(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId, isActive: true },
      include: { company: true, employee: { include: { workCenter: true } } },
    });
  }

  private async generateTokens(user: any) {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      companyId: user.companyId,
      employeeId: user.employeeId,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.config.get('JWT_SECRET'),
        expiresIn: this.config.get('JWT_EXPIRES_IN', '15m'),
      }),
      this.jwtService.signAsync(
        { sub: user.id, jti: uuidv4() },
        {
          secret: this.config.get('JWT_REFRESH_SECRET'),
          expiresIn: this.config.get('JWT_REFRESH_EXPIRES_IN', '7d'),
        },
      ),
    ]);

    return { accessToken, refreshToken };
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('Usuario no encontrado');

    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValid) throw new UnauthorizedException('Contraseña actual incorrecta');

    const newHash = await bcrypt.hash(newPassword, 12);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newHash },
    });

    await this.auditService.log({
      companyId: user.companyId ?? '',
      userId: user.id,
      action: AuditAction.PASSWORD_RESET,
      entityType: 'User',
      entityId: user.id,
      description: 'Cambio de contraseña por el usuario',
    });
    // Sessions remain active — user authenticated with current password, no need to force logout
  }

  async setPassword(userId: string, newPassword: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('Usuario no encontrado');
    if (!user.mustChangePassword) throw new ForbiddenException('No se requiere cambio de contraseña');
    const hash = await bcrypt.hash(newPassword, 12);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: hash, mustChangePassword: false },
    });
  }

  private sanitizeUser(user: any) {
    const { passwordHash, ...safe } = user;
    return {
      ...safe,
      mustChangePassword: user.mustChangePassword,
    };
  }

  private parseExpiry(expiry: string): number {
    const match = expiry.match(/^(\d+)([smhd])$/);
    if (!match) return 7 * 24 * 60 * 60 * 1000;
    const value = parseInt(match[1]);
    const unit = match[2];
    const multipliers: Record<string, number> = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    };
    return value * (multipliers[unit] ?? 1000);
  }
}
