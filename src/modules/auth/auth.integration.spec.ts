import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../../app.module';
import { AuthService } from './auth.service';
import { User, UserRole } from '../users/entities/user.entity';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { INestApplication, UnauthorizedException, ConflictException, ForbiddenException } from '@nestjs/common';
import { tenantStorage } from '../tenants/tenant.context';
import { DEFAULT_TENANT_ID, SECOND_TENANT_ID } from '../tenants/tenants.service';
import { EmailService } from '../notifications/services/email.service';

describe('Auth Integration Tests', () => {
  jest.setTimeout(30000);
  let module: TestingModule;
  let app: INestApplication;
  let authService: AuthService;
  let userRepository: Repository<User>;
  let emailService: EmailService;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module.createNestApplication();
    await app.init();

    authService = module.get<AuthService>(AuthService);
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    emailService = module.get<EmailService>(EmailService);
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  beforeEach(async () => {
    // Clear users created for testing to keep it clean, but keep seeded ones
    await tenantStorage.run({ tenantId: DEFAULT_TENANT_ID, slug: 'gadgets-heaven' }, async () => {
      await userRepository.delete({ email: 'testcustomer@example.com' });
      await userRepository.delete({ email: 'googleuser@example.com' });
    });
    await tenantStorage.run({ tenantId: SECOND_TENANT_ID, slug: 'jersey-mania' }, async () => {
      await userRepository.delete({ email: 'testcustomer@example.com' });
      await userRepository.delete({ email: 'googleuser@example.com' });
    });
  });

  it('1. Google login creates a customer account on tenant A, login works, and is isolated from tenant B', async () => {
    // Mock the google verification fetch
    const mockGoogleIdToken = 'mock-id-token-xyz';
    jest.spyOn(global, 'fetch').mockImplementation((url: any) => {
      if (url.includes('tokeninfo')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            email: 'googleuser@example.com',
            sub: 'google-uid-12345',
            given_name: 'Google',
            family_name: 'User',
            aud: 'mock-google-client-id',
          }),
        } as any);
      }
      return Promise.reject(new Error('Unknown url'));
    });

    // Run Google login under Tenant A context
    const result = await tenantStorage.run(
      { tenantId: DEFAULT_TENANT_ID, slug: 'gadgets-heaven' },
      async () => {
        return authService.loginWithGoogle(mockGoogleIdToken);
      }
    );

    expect(result.token).toBeDefined();
    expect(result.user.email).toBe('googleuser@example.com');
    expect(result.user.googleId).toBe('google-uid-12345');
    expect(result.user.role).toBe(UserRole.CUSTOMER);

    // Confirm user exists in Tenant A
    const userInA = await tenantStorage.run(
      { tenantId: DEFAULT_TENANT_ID, slug: 'gadgets-heaven' },
      async () => {
        return userRepository.findOne({ where: { email: 'googleuser@example.com' } });
      }
    );
    expect(userInA).toBeDefined();
    expect(userInA?.tenantId).toBe(DEFAULT_TENANT_ID);

    // Confirm querying from Tenant B context throws ForbiddenException due to tenant isolation subscriber
    await expect(
      tenantStorage.run(
        { tenantId: SECOND_TENANT_ID, slug: 'jersey-mania' },
        async () => {
          return userRepository.findOne({ where: { email: 'googleuser@example.com' } });
        }
      )
    ).rejects.toThrow(ForbiddenException);
  });

  it('2. Email/password register + login works for a customer', async () => {
    const registerData = {
      email: 'testcustomer@example.com',
      password: 'password123',
      firstName: 'Test',
      lastName: 'Customer',
      phoneNumber: '1234567890',
    };

    // Register under Tenant A
    const regResult = await tenantStorage.run(
      { tenantId: DEFAULT_TENANT_ID, slug: 'gadgets-heaven' },
      async () => {
        return authService.register(registerData);
      }
    );
    expect(regResult.token).toBeDefined();
    expect(regResult.user.email).toBe(registerData.email);

    // Login under Tenant A
    const loginResult = await tenantStorage.run(
      { tenantId: DEFAULT_TENANT_ID, slug: 'gadgets-heaven' },
      async () => {
        return authService.login({ email: registerData.email, password: registerData.password }, [UserRole.CUSTOMER]);
      }
    );
    expect(loginResult.token).toBeDefined();
    expect(loginResult.user.role).toBe(UserRole.CUSTOMER);

    // Login under Tenant B should fail due to tenant isolation subscriber
    await expect(
      tenantStorage.run(
        { tenantId: SECOND_TENANT_ID, slug: 'jersey-mania' },
        async () => {
          return authService.login({ email: registerData.email, password: registerData.password }, [UserRole.CUSTOMER]);
        }
      )
    ).rejects.toThrow(ForbiddenException);
  });

  it('3. A Google login and an email/password account with the same email link correctly', async () => {
    const email = 'googleuser@example.com';
    
    // First, register via email/password under Tenant A
    await tenantStorage.run(
      { tenantId: DEFAULT_TENANT_ID, slug: 'gadgets-heaven' },
      async () => {
        return authService.register({
          email,
          password: 'password123',
          firstName: 'Google',
          lastName: 'User',
        });
      }
    );

    // Now, login via Google under Tenant A with the same email
    const mockGoogleIdToken = 'mock-id-token-xyz';
    jest.spyOn(global, 'fetch').mockImplementation((url: any) => {
      if (url.includes('tokeninfo')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            email,
            sub: 'google-uid-12345',
            given_name: 'Google',
            family_name: 'User',
            aud: 'mock-google-client-id',
          }),
        } as any);
      }
      return Promise.reject(new Error('Unknown url'));
    });

    const result = await tenantStorage.run(
      { tenantId: DEFAULT_TENANT_ID, slug: 'gadgets-heaven' },
      async () => {
        return authService.loginWithGoogle(mockGoogleIdToken);
      }
    );

    // Check that we got the user and the googleId has been linked
    expect(result.token).toBeDefined();
    expect(result.user.email).toBe(email);
    expect(result.user.googleId).toBe('google-uid-12345');

    // Verify there is only one user record in the DB
    const users = await tenantStorage.run(
      { tenantId: DEFAULT_TENANT_ID, slug: 'gadgets-heaven' },
      async () => {
        return userRepository.find({ where: { email } });
      }
    );
    expect(users.length).toBe(1);
    expect(users[0].googleId).toBe('google-uid-12345');
  });

  it('4. Admin login works, and rate limiting triggers block', async () => {
    // Seeded admin user is admin@gadgetsheaven.com, password is password123
    const adminEmail = 'admin@gadgetsheaven.com';

    // Successful admin login
    const loginResult = await tenantStorage.run(
      { tenantId: DEFAULT_TENANT_ID, slug: 'gadgets-heaven' },
      async () => {
        return authService.login({ email: adminEmail, password: 'password123' }, [UserRole.ADMIN]);
      }
    );
    expect(loginResult.token).toBeDefined();
    expect(loginResult.user.role).toBe(UserRole.ADMIN);

    // Trigger rate limit: fail 5 times
    await tenantStorage.run(
      { tenantId: DEFAULT_TENANT_ID, slug: 'gadgets-heaven' },
      async () => {
        for (let i = 0; i < 5; i++) {
          try {
            await authService.login({ email: adminEmail, password: 'wrongpassword' });
          } catch (e) {
            // ignore
          }
        }
      }
    );

    // 6th attempt should trigger rate limit block
    await expect(
      tenantStorage.run(
        { tenantId: DEFAULT_TENANT_ID, slug: 'gadgets-heaven' },
        async () => {
          return authService.login({ email: adminEmail, password: 'password123' });
        }
      )
    ).rejects.toThrow(UnauthorizedException);
  });

  it('5. Forgot password flow triggers notification and reset works', async () => {
    const customerEmail = 'testcustomer@example.com';

    // Register a customer first
    await tenantStorage.run(
      { tenantId: DEFAULT_TENANT_ID, slug: 'gadgets-heaven' },
      async () => {
        return authService.register({
          email: customerEmail,
          password: 'password123',
          firstName: 'Reset',
          lastName: 'Tester',
        });
      }
    );

    // Spy on email service
    const emailSpy = jest.spyOn(emailService, 'sendEmail');

    // Trigger forgot password
    const forgotResult = await tenantStorage.run(
      { tenantId: DEFAULT_TENANT_ID, slug: 'gadgets-heaven' },
      async () => {
        return authService.forgotPassword(customerEmail);
      }
    );
    expect(forgotResult.message).toContain('Reset email sent');
    expect(emailSpy).toHaveBeenCalled();

    // Retrieve the token from the link sent in email
    const emailContent = emailSpy.mock.calls[0][2];
    const tokenMatch = emailContent.match(/token=([^&\s]+)/);
    expect(tokenMatch).toBeDefined();
    const token = tokenMatch![1];

    // Reset password
    const resetResult = await tenantStorage.run(
      { tenantId: DEFAULT_TENANT_ID, slug: 'gadgets-heaven' },
      async () => {
        return authService.resetPassword(token, 'newpassword123');
      }
    );
    expect(resetResult.message).toContain('Password reset successfully');

    // Confirm login works with new password
    const loginResult = await tenantStorage.run(
      { tenantId: DEFAULT_TENANT_ID, slug: 'gadgets-heaven' },
      async () => {
        return authService.login({ email: customerEmail, password: 'newpassword123' }, [UserRole.CUSTOMER]);
      }
    );
    expect(loginResult.token).toBeDefined();
  });
});
