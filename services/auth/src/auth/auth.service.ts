import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { RpcException } from '@nestjs/microservices';
import { status } from '@grpc/grpc-js';
import { User } from '../entities/user.entity';
import { RedisService } from '../redis/redis.service';
import {
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

interface JwtPayload {
    userId: string;
    email: string;
}

interface SessionData {
    userId: string;
    email: string;
    refreshToken: string;
    expiresAt: number;
}

@Injectable()
export class AuthService {
    private readonly jwtSecret: string;
    private readonly jwtExpiresIn: string;
    private readonly refreshExpiresIn: string;

    constructor(
        @InjectRepository(User)
        private userRepository: Repository<User>,
        private redisService: RedisService,
        private configService: ConfigService,
    ) {
        this.jwtSecret = this.configService.get<string>('jwt.secret');
        this.jwtExpiresIn = this.configService.get<string>('jwt.expiresIn');
        this.refreshExpiresIn = this.configService.get<string>('jwt.refreshExpiresIn');
    }

    async register(request: RegisterRequest): Promise<RegisterResponse> {
        const { email, password, name } = request;

        // Validate required fields
        if (!email || !password || !name) {
            throw new RpcException({
                code: status.INVALID_ARGUMENT,
                message: 'Email, password, and name are required',
            });
        }

        // Check if user already exists
        const existingUser = await this.userRepository.findOne({ where: { email } });
        if (existingUser) {
            throw new RpcException({
                code: status.ALREADY_EXISTS,
                message: 'User with this email already exists',
            });
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 10);

        // Create user
        const user = this.userRepository.create({
            email,
            passwordHash,
            name,
        });

        await this.userRepository.save(user);

        // Generate tokens
        const { accessToken, refreshToken, expiresAt } = await this.generateTokens(user);

        // Store session in Redis
        await this.storeSession(user.id, user.email, refreshToken, expiresAt);

        return {
            userId: user.id,
            accessToken,
            refreshToken,
            expiresAt,
        };
    }

    async login(request: LoginRequest): Promise<LoginResponse> {
        const { email, password } = request;

        // Validate required fields
        if (!email || !password) {
            throw new RpcException({
                code: status.INVALID_ARGUMENT,
                message: 'Email and password are required',
            });
        }

        // Find user
        const user = await this.userRepository.findOne({ where: { email } });
        if (!user) {
            throw new RpcException({
                code: status.UNAUTHENTICATED,
                message: 'Invalid credentials',
            });
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
        if (!isPasswordValid) {
            throw new RpcException({
                code: status.UNAUTHENTICATED,
                message: 'Invalid credentials',
            });
        }

        // Generate tokens
        const { accessToken, refreshToken, expiresAt } = await this.generateTokens(user);

        // Store session in Redis
        await this.storeSession(user.id, user.email, refreshToken, expiresAt);

        return {
            userId: user.id,
            accessToken,
            refreshToken,
            expiresAt,
        };
    }

    async validateToken(request: ValidateTokenRequest): Promise<ValidateTokenResponse> {
        const { token } = request;

        if (!token) {
            throw new RpcException({
                code: status.INVALID_ARGUMENT,
                message: 'Token is required',
            });
        }

        try {
            const decoded = jwt.verify(token, this.jwtSecret) as JwtPayload;

            // Check if session exists in Redis
            const sessionExists = await this.redisService.exists(`session:${decoded.userId}`);
            if (!sessionExists) {
                return {
                    valid: false,
                    userId: '',
                    roles: [],
                };
            }

            return {
                valid: true,
                userId: decoded.userId,
                roles: [],
            };
        } catch (error) {
            return {
                valid: false,
                userId: '',
                roles: [],
            };
        }
    }

    async refreshToken(request: RefreshTokenRequest): Promise<RefreshTokenResponse> {
        const { refreshToken } = request;

        if (!refreshToken) {
            throw new RpcException({
                code: status.INVALID_ARGUMENT,
                message: 'Refresh token is required',
            });
        }

        try {
            // Verify refresh token
            const decoded = jwt.verify(refreshToken, this.jwtSecret) as JwtPayload;

            // Get session from Redis
            const sessionKey = `session:${decoded.userId}`;
            const sessionData = await this.redisService.get(sessionKey);

            if (!sessionData) {
                throw new RpcException({
                    code: status.UNAUTHENTICATED,
                    message: 'Invalid or expired refresh token',
                });
            }

            const session: SessionData = JSON.parse(sessionData);

            // Verify refresh token matches
            if (session.refreshToken !== refreshToken) {
                throw new RpcException({
                    code: status.UNAUTHENTICATED,
                    message: 'Invalid refresh token',
                });
            }

            // Get user
            const user = await this.userRepository.findOne({ where: { id: decoded.userId } });
            if (!user) {
                throw new RpcException({
                    code: status.NOT_FOUND,
                    message: 'User not found',
                });
            }

            // Generate new tokens
            const tokens = await this.generateTokens(user);

            // Update session in Redis
            await this.storeSession(user.id, user.email, tokens.refreshToken, tokens.expiresAt);

            return {
                accessToken: tokens.accessToken,
                refreshToken: tokens.refreshToken,
                expiresAt: tokens.expiresAt,
            };
        } catch (error) {
            if (error instanceof RpcException) {
                throw error;
            }
            throw new RpcException({
                code: status.UNAUTHENTICATED,
                message: 'Invalid or expired refresh token',
            });
        }
    }

    async logout(request: LogoutRequest): Promise<LogoutResponse> {
        const { userId } = request;

        if (!userId) {
            throw new RpcException({
                code: status.INVALID_ARGUMENT,
                message: 'User ID is required',
            });
        }

        // Delete session from Redis
        await this.redisService.del(`session:${userId}`);

        return {
            success: true,
        };
    }

    async getProfile(request: GetProfileRequest): Promise<UserProfile> {
        const { userId } = request;

        if (!userId) {
            throw new RpcException({
                code: status.INVALID_ARGUMENT,
                message: 'User ID is required',
            });
        }

        // Find user
        const user = await this.userRepository.findOne({ where: { id: userId } });
        if (!user) {
            throw new RpcException({
                code: status.NOT_FOUND,
                message: 'User not found',
            });
        }

        return {
            userId: user.id,
            email: user.email,
            name: user.name,
            createdAt: user.createdAt.toISOString(),
        };
    }

    private async generateTokens(user: User): Promise<{
        accessToken: string;
        refreshToken: string;
        expiresAt: number;
    }> {
        const payload: JwtPayload = {
            userId: user.id,
            email: user.email,
        };

        const accessToken = jwt.sign(payload, this.jwtSecret, {
            expiresIn: this.jwtExpiresIn as string,
        } as jwt.SignOptions);

        const refreshToken = jwt.sign(payload, this.jwtSecret, {
            expiresIn: this.refreshExpiresIn as string,
        } as jwt.SignOptions);

        // Calculate expiration timestamp (7 days from now)
        const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;

        return {
            accessToken,
            refreshToken,
            expiresAt,
        };
    }

    private async storeSession(
        userId: string,
        email: string,
        refreshToken: string,
        expiresAt: number,
    ): Promise<void> {
        const sessionData: SessionData = {
            userId,
            email,
            refreshToken,
            expiresAt,
        };

        const sessionKey = `session:${userId}`;
        const ttl = 7 * 24 * 60 * 60; // 7 days in seconds

        await this.redisService.set(sessionKey, JSON.stringify(sessionData), ttl);
    }
}
