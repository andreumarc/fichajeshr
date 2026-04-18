import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';

const SAFE_METHODS = ['GET', 'HEAD', 'OPTIONS'];

/**
 * Bloquea cualquier mutación (POST/PUT/PATCH/DELETE) para usuarios con rol DEMO.
 * Se registra como guard global, ejecutándose después de JwtAuthGuard.
 */
@Injectable()
export class DemoReadonlyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const user = req.user;

    if (!user) return true;

    if (user.role === UserRole.DEMO) {
      const method: string = req.method?.toUpperCase() ?? 'GET';
      if (!SAFE_METHODS.includes(method)) {
        throw new ForbiddenException(
          'El usuario demo es de solo lectura. No se permiten modificaciones.',
        );
      }
    }

    return true;
  }
}
