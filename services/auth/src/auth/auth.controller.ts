import { Controller } from '@nestjs/common';
import { AuthService } from './auth.service';
import {
    AuthServiceController,
    AuthServiceControllerMethods,
    RegisterRequest,
    RegisterResponse,
    LoginRequest,
    LoginResponse,
    ValidateTokenRequest,
    ValidateTokenResponse,
    RefreshTokenRequest,
    RefreshTokenResponse,
    LogoutRequest,
    LogoutResponse,
    GetProfileRequest,
    UserProfile,
} from '../proto/auth';

@Controller()
@AuthServiceControllerMethods()
export class AuthController implements AuthServiceController {
    constructor(private readonly authService: AuthService) { }

    async register(request: RegisterRequest): Promise<RegisterResponse> {
        return this.authService.register(request);
    }

    async login(request: LoginRequest): Promise<LoginResponse> {
        return this.authService.login(request);
    }

    async validateToken(request: ValidateTokenRequest): Promise<ValidateTokenResponse> {
        return this.authService.validateToken(request);
    }

    async refreshToken(request: RefreshTokenRequest): Promise<RefreshTokenResponse> {
        return this.authService.refreshToken(request);
    }

    async logout(request: LogoutRequest): Promise<LogoutResponse> {
        return this.authService.logout(request);
    }

    async getProfile(request: GetProfileRequest): Promise<UserProfile> {
        return this.authService.getProfile(request);
    }
}
