import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from '../users/entities/user.entity';
import { LoginDto, RegisterDto } from './dto/auth.dto';
import { ConfigService } from '@nestjs/config';
import { EmailService } from '../notifications/services/email.service';
import { getTenantId } from '../tenants/tenant.context';

@Injectable()
export class AuthService {
  private loginAttempts = new Map<string, { count: number; blockedUntil: Date }>();

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
  ) {}

  private checkRateLimit(email: string) {
    const attempt = this.loginAttempts.get(email);
    if (attempt && attempt.blockedUntil > new Date()) {
      const waitTime = Math.ceil(
        (attempt.blockedUntil.getTime() - Date.now()) / 1000 / 60,
      );
      throw new UnauthorizedException(
        `Too many failed login attempts. Please try again in ${waitTime} minutes.`,
      );
    }
  }

  private recordLoginFailure(email: string) {
    const attempt = this.loginAttempts.get(email) || {
      count: 0,
      blockedUntil: new Date(),
    };
    attempt.count += 1;
    if (attempt.count >= 5) {
      attempt.blockedUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 mins block
    }
    this.loginAttempts.set(email, attempt);
  }

  private resetLoginAttempts(email: string) {
    this.loginAttempts.delete(email);
  }

  async register(
    registerDto: RegisterDto,
  ): Promise<{ token: string; user: Partial<User> }> {
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

  async login(
    loginDto: LoginDto,
    allowedRoles?: UserRole[],
  ): Promise<{ token: string; user: Partial<User> }> {
    this.checkRateLimit(loginDto.email);

    const user = await this.userRepository.findOne({
      where: { email: loginDto.email },
    });

    if (!user || !(await user.validatePassword(loginDto.password))) {
      this.recordLoginFailure(loginDto.email);
      throw new UnauthorizedException('Invalid credentials');
    }

    if (allowedRoles && !allowedRoles.includes(user.role)) {
      throw new UnauthorizedException('Access Denied: Invalid role');
    }

    this.resetLoginAttempts(loginDto.email);

    const token = this.generateToken(user);
    const { password, ...result } = user;

    return {
      token,
      user: result,
    };
  }

  async loginWithGoogle(
    idToken: string,
  ): Promise<{ token: string; user: Partial<User> }> {
    let email: string;
    let googleId: string;
    let firstName: string;
    let lastName: string;

    try {
      const response = await fetch(
        `https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`,
      );
      if (!response.ok) {
        throw new UnauthorizedException('Invalid Google token');
      }
      const payload = await response.json();
      email = payload.email;
      googleId = payload.sub;
      firstName = payload.given_name || '';
      lastName = payload.family_name || '';

      const configuredClientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
      if (configuredClientId && payload.aud !== configuredClientId) {
        throw new UnauthorizedException('Google token audience mismatch');
      }
    } catch (err) {
      throw new UnauthorizedException('Google token verification failed');
    }

    // Tenant-scoped lookups are automatic via Subscriber
    let user = await this.userRepository.findOne({
      where: { email },
    });

    if (user) {
      // Account linking logic
      if (!user.googleId) {
        user.googleId = googleId;
        await this.userRepository.save(user);
      } else if (user.googleId !== googleId) {
        throw new ConflictException(
          'This email is already associated with a different Google account.',
        );
      }
    } else {
      // Create new customer account
      user = this.userRepository.create({
        email,
        googleId,
        firstName,
        lastName,
        role: UserRole.CUSTOMER,
        tenantId: getTenantId(),
      });
      await this.userRepository.save(user);
    }

    const token = this.generateToken(user);
    const { password, ...result } = user;

    return {
      token,
      user: result,
    };
  }

  async forgotPassword(email: string): Promise<{ message: string }> {
    const user = await this.userRepository.findOne({
      where: { email },
    });

    // Silently return success to prevent user enumeration
    if (!user) {
      return { message: 'Reset email sent if user exists' };
    }

    // Sign a 15-minute reset token containing user identity and tenantId
    const resetToken = this.jwtService.sign(
      {
        sub: user.id,
        email: user.email,
        tenantId: user.tenantId,
        purpose: 'reset-password',
      },
      {
        expiresIn: '15m',
      },
    );

    const storefrontUrl =
      this.configService.get<string>('STOREFRONT_URL') ||
      'http://localhost:3001';
    const resetLink = `${storefrontUrl}/auth/reset-password?token=${resetToken}`;

    await this.emailService.sendEmail(
      user.email,
      'Reset Your Password',
      `You requested a password reset. Click the following link to reset your password: ${resetLink}`,
    );

    return { message: 'Reset email sent if user exists' };
  }

  async resetPassword(
    token: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    let payload: any;
    try {
      payload = this.jwtService.verify(token);
    } catch (err) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    if (payload.purpose !== 'reset-password') {
      throw new BadRequestException('Invalid token purpose');
    }

    const user = await this.userRepository.findOne({
      where: { id: payload.sub },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    user.password = newPassword;
    await this.userRepository.save(user);

    return { message: 'Password reset successfully' };
  }

  private generateToken(user: User): string {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
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
