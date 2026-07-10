import {
  Injectable,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';
import { getTenantId } from '../../tenants/tenant.context';

@Injectable()
export class CustomerAuthGuard extends JwtAuthGuard {
  async canActivate(context: ExecutionContext): Promise<boolean> {
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

    if (user.role !== 'customer') {
      throw new ForbiddenException('Access Denied: Customer account required.');
    }

    const resolvedTenantId = getTenantId();
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
