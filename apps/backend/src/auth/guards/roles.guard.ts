import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Inject } from '@nestjs/common';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { UserRole } from '@prisma/client';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { Reflector } = require('@nestjs/core');

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(@Inject(Reflector) private reflector: any) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]) as UserRole[];

    if (!requiredRoles || requiredRoles.length === 0) return true;

    const { user } = context.switchToHttp().getRequest();
    if (!user) throw new ForbiddenException('No autenticado');

    const hasRole = requiredRoles.some((role) => {
      if (user.role === UserRole.SUPERADMIN) return true;
      return user.role === role;
    });

    if (!hasRole) {
      throw new ForbiddenException(`Rol requerido: ${requiredRoles.join(' o ')}`);
    }

    return true;
  }
}
