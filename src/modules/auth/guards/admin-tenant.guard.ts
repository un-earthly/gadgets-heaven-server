import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from './jwt-auth.guard';
import { getTenantId } from '../../tenants/tenant.context';

@Injectable()
export class AdminTenantGuard extends JwtAuthGuard {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if route has JwtAuthGuard applied
    const guards =
      this.reflector.getAllAndMerge<any[]>('__guards__', [
        context.getHandler(),
        context.getClass(),
      ]) || [];

    const hasJwtGuard = guards.some(
      (guard) =>
        guard === JwtAuthGuard || (guard && guard.name === 'JwtAuthGuard'),
    );

    // If route does not require authentication, bypass tenant user check
    if (!hasJwtGuard) {
      return true;
    }

    // Run JwtAuthGuard validation first to populate request.user
    try {
      const isAuthenticated = await super.canActivate(context);
      if (!isAuthenticated) {
        return false;
      }
    } catch (err) {
      throw new UnauthorizedException('Authentication failed');
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException('User not authenticated');
    }

    const resolvedTenantId = getTenantId();

    // Enforce tenant scoping: User's tenantId must match the resolved tenant context
    if (
      resolvedTenantId &&
      user.tenantId &&
      user.tenantId !== resolvedTenantId
    ) {
      throw new ForbiddenException(
        'Access Denied: You do not belong to this tenant.',
      );
    }

    return true;
  }
}
