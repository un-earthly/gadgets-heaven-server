import { Controller, Post, Get, Body, Inject, OnModuleInit, UseGuards, Req } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import {
    AUTH_SERVICE_NAME,
    AuthServiceClient,
    RegisterRequest,
    LoginRequest,
    RefreshTokenRequest,
} from '../proto/auth';
import { AuthGuard } from '../guards/auth.guard';

@Controller('auth')
export class AuthController implements OnModuleInit {
    private authService: AuthServiceClient;

    constructor(@Inject(AUTH_SERVICE_NAME) private client: ClientGrpc) { }

    onModuleInit() {
        this.authService = this.client.getService<AuthServiceClient>(AUTH_SERVICE_NAME);
    }

    @Post('register')
    async register(@Body() body: RegisterRequest) {
        const response = await firstValueFrom(this.authService.register(body));
        return {
            userId: response.userId,
            accessToken: response.accessToken,
            refreshToken: response.refreshToken,
            expiresAt: response.expiresAt,
        };
    }

    @Post('login')
    async login(@Body() body: LoginRequest) {
        const response = await firstValueFrom(this.authService.login(body));
        return {
            userId: response.userId,
            accessToken: response.accessToken,
            refreshToken: response.refreshToken,
            expiresAt: response.expiresAt,
        };
    }

    @Post('refresh')
    async refresh(@Body() body: RefreshTokenRequest) {
        const response = await firstValueFrom(this.authService.refreshToken(body));
        return {
            accessToken: response.accessToken,
            refreshToken: response.refreshToken,
            expiresAt: response.expiresAt,
        };
    }

    @Get('profile')
    @UseGuards(AuthGuard)
    async getProfile(@Req() req: any) {
        const userId = req.user.userId;
        const response = await firstValueFrom(this.authService.getProfile({ userId }));
        return {
            userId: response.userId,
            email: response.email,
            name: response.name,
            createdAt: response.createdAt,
        };
    }
}
