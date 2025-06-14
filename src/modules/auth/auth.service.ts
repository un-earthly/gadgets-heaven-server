import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { LoginDto, RegisterDto } from './dto/auth.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
    constructor(
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
        private readonly jwtService: JwtService,
    ) { }

    async register(registerDto: RegisterDto): Promise<{ token: string; user: Partial<User> }> {
        const existingUser = await this.userRepository.findOne({
            where: { email: registerDto.email },
        });

        if (existingUser) {
            throw new ConflictException('User with this email already exists');
        }

        const user = this.userRepository.create(registerDto);
        await this.userRepository.save(user);

        const token = this.generateToken(user);
        const { password, ...result } = user;

        return {
            token,
            user: result,
        };
    }

    async login(loginDto: LoginDto): Promise<{ token: string; user: Partial<User> }> {
        const user = await this.userRepository.findOne({
            where: { email: loginDto.email },
        });

        if (!user || !(await user.validatePassword(loginDto.password))) {
            throw new UnauthorizedException('Invalid credentials');
        }

        const token = this.generateToken(user);
        const { password, ...result } = user;

        return {
            token,
            user: result,
        };
    }

    private generateToken(user: User): string {
        const payload = {
            sub: user.id,
            email: user.email,
            role: user.role,
        };

        return this.jwtService.sign(payload);
    }

    async validateUser(id: string): Promise<User> {
        const user = await this.userRepository.findOne({
            where: { id },
        });

        if (!user) {
            throw new UnauthorizedException('User not found');
        }

        return user;
    }
} 