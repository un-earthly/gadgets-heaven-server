import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Request,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto } from './dto/auth.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { UserRole } from '../users/entities/user.entity';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new customer' })
  @ApiResponse({ status: 201, description: 'Customer successfully registered' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 409, description: 'User already exists' })
  async register(@Body() registerDto: RegisterDto) {
    // For V1, self-registration via endpoint defaults to customer role
    registerDto.role = UserRole.CUSTOMER;
    return this.authService.register(registerDto);
  }

  @Post('login')
  @ApiOperation({ summary: 'Login customer' })
  @ApiResponse({ status: 200, description: 'Customer successfully logged in' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async login(@Body() loginDto: LoginDto) {
    // Regular login endpoint is restricted to customer accounts
    return this.authService.login(loginDto, [UserRole.CUSTOMER]);
  }

  @Post('admin/login')
  @ApiOperation({ summary: 'Login admin or staff' })
  @ApiResponse({ status: 200, description: 'Admin/Staff successfully logged in' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async adminLogin(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto, [
      UserRole.ADMIN,
      UserRole.OWNER,
      UserRole.STAFF,
    ]);
  }

  @Post('google')
  @ApiOperation({ summary: 'Login or signup with Google OAuth token' })
  @ApiResponse({ status: 200, description: 'Successfully logged in with Google' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async loginWithGoogle(@Body('idToken') idToken: string) {
    return this.authService.loginWithGoogle(idToken);
  }

  @Post('forgot-password')
  @ApiOperation({ summary: 'Request password reset email' })
  @ApiResponse({ status: 200, description: 'Reset email triggered' })
  async forgotPassword(@Body('email') email: string) {
    return this.authService.forgotPassword(email);
  }

  @Post('reset-password')
  @ApiOperation({ summary: 'Reset password with token' })
  @ApiResponse({ status: 200, description: 'Password reset successful' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  async resetPassword(
    @Body('token') token: string,
    @Body('password') newPassword: string,
  ) {
    return this.authService.resetPassword(token, newPassword);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  @ApiOperation({ summary: 'Get user profile' })
  @ApiResponse({ status: 200, description: 'Profile retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getProfile(@Request() req) {
    return req.user;
  }
}
