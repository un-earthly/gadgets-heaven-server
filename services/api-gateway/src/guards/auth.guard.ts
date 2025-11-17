import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, Inject, OnModuleInit } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { AUTH_SERVICE_NAME, AuthServiceClient } from '../proto/auth';

@Injectable()
export class AuthGuard implements CanActivate, OnModuleInit {
    private authService: AuthServiceClient;

    constructor(@Inject(AUTH_SERVICE_NAME) private client: ClientGrpc) { }

    onModuleInit() {
        this.authService = this.client.getService<AuthServiceClient>(AUTH_SERVICE_NAME);
    }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const authHeader = request.headers.authorization;

        if (!authHeader) {
            throw new UnauthorizedException('No authorization header');
        }

        const token = authHeader.replace('Bearer ', '');

        try {
            const response = await firstValueFrom(
                this.authService.validateToken({ token })
            );

            if (!response.valid) {
                throw new UnauthorizedException('Invalid token');
            }

            // Attach user info to request
            request.user = {
                userId: response.userId,
                roles: response.roles,
            };

            return true;
        } catch (error) {
            throw new UnauthorizedException('Token validation failed');
        }
    }
}
