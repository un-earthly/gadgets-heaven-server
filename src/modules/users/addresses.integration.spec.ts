import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../../app.module';
import { AddressesService } from './addresses.service';
import { Address } from './entities/address.entity';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { INestApplication, NotFoundException, ForbiddenException } from '@nestjs/common';
import { tenantStorage } from '../tenants/tenant.context';
import { DEFAULT_TENANT_ID, SECOND_TENANT_ID } from '../tenants/tenants.service';

import { User, UserRole } from './entities/user.entity';

describe('Addresses Integration Tests', () => {
  jest.setTimeout(30000);
  let module: TestingModule;
  let app: INestApplication;
  let addressesService: AddressesService;
  let addressRepository: Repository<Address>;
  let userRepository: Repository<User>;

  const customerIdA = '123e4567-e89b-12d3-a456-426614174001';
  const customerIdB = '123e4567-e89b-12d3-a456-426614174002';

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module.createNestApplication();
    await app.init();

    addressesService = module.get<AddressesService>(AddressesService);
    addressRepository = module.get<Repository<Address>>(getRepositoryToken(Address));
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));

    // Ensure users exist
    await tenantStorage.run({ tenantId: DEFAULT_TENANT_ID, slug: 'gadgets-heaven' }, async () => {
      let user = await userRepository.findOne({ where: { id: customerIdA } });
      if (!user) {
        user = userRepository.create({
          id: customerIdA,
          email: 'usera@example.com',
          password: 'password',
          role: UserRole.CUSTOMER,
          firstName: 'Alice',
          lastName: 'Smith',
        });
        await userRepository.save(user);
      }
    });

    await tenantStorage.run({ tenantId: SECOND_TENANT_ID, slug: 'jersey-mania' }, async () => {
      let user = await userRepository.findOne({ where: { id: customerIdB } });
      if (!user) {
        user = userRepository.create({
          id: customerIdB,
          email: 'userb@example.com',
          password: 'password',
          role: UserRole.CUSTOMER,
          firstName: 'Bob',
          lastName: 'Jones',
        });
        await userRepository.save(user);
      }
    });
  });

  afterAll(async () => {
    await tenantStorage.run({ tenantId: DEFAULT_TENANT_ID, slug: 'gadgets-heaven' }, async () => {
      await addressRepository.delete({ userId: customerIdA });
      await userRepository.delete(customerIdA);
    });
    await tenantStorage.run({ tenantId: SECOND_TENANT_ID, slug: 'jersey-mania' }, async () => {
      await addressRepository.delete({ userId: customerIdB });
      await userRepository.delete(customerIdB);
    });
    if (app) {
      await app.close();
    }
  });

  beforeEach(async () => {
    // Clean addresses created during test
    await tenantStorage.run({ tenantId: DEFAULT_TENANT_ID, slug: 'gadgets-heaven' }, async () => {
      await addressRepository.delete({ userId: customerIdA });
      await addressRepository.delete({ userId: customerIdB });
    });
    await tenantStorage.run({ tenantId: SECOND_TENANT_ID, slug: 'jersey-mania' }, async () => {
      await addressRepository.delete({ userId: customerIdA });
      await addressRepository.delete({ userId: customerIdB });
    });
  });

  it('1. Should CRUD addresses for a customer successfully', async () => {
    const addressData: Partial<Address> = {
      firstName: 'John',
      lastName: 'Doe',
      addressLine1: '123 Main St',
      city: 'Dhaka',
      country: 'Bangladesh',
      phoneNumber: '01712345678',
      isDefault: false,
    };

    // Create address under Tenant A
    const created = await tenantStorage.run(
      { tenantId: DEFAULT_TENANT_ID, slug: 'gadgets-heaven' },
      async () => {
        return addressesService.create(customerIdA, addressData);
      }
    );

    expect(created.id).toBeDefined();
    expect(created.userId).toBe(customerIdA);
    // Since it is the first address, it should automatically be default
    expect(created.isDefault).toBe(true);

    // Add a second address, explicitly marking it default
    const created2 = await tenantStorage.run(
      { tenantId: DEFAULT_TENANT_ID, slug: 'gadgets-heaven' },
      async () => {
        return addressesService.create(customerIdA, {
          ...addressData,
          addressLine1: '456 Second St',
          isDefault: true,
        });
      }
    );

    expect(created2.isDefault).toBe(true);

    // Verify first address is no longer default
    const firstUpdated = await tenantStorage.run(
      { tenantId: DEFAULT_TENANT_ID, slug: 'gadgets-heaven' },
      async () => {
        return addressesService.findOne(customerIdA, created.id);
      }
    );
    expect(firstUpdated.isDefault).toBe(false);

    // List all addresses
    const all = await tenantStorage.run(
      { tenantId: DEFAULT_TENANT_ID, slug: 'gadgets-heaven' },
      async () => {
        return addressesService.findAll(customerIdA);
      }
    );
    expect(all.length).toBe(2);
    // Default address should be first
    expect(all[0].id).toBe(created2.id);

    // Update address
    const updated = await tenantStorage.run(
      { tenantId: DEFAULT_TENANT_ID, slug: 'gadgets-heaven' },
      async () => {
        return addressesService.update(customerIdA, created.id, { addressLine1: '123 Main St Updated' });
      }
    );
    expect(updated.addressLine1).toBe('123 Main St Updated');

    // Delete address
    await tenantStorage.run(
      { tenantId: DEFAULT_TENANT_ID, slug: 'gadgets-heaven' },
      async () => {
        return addressesService.remove(customerIdA, created.id);
      }
    );

    await expect(
      tenantStorage.run(
        { tenantId: DEFAULT_TENANT_ID, slug: 'gadgets-heaven' },
        async () => {
          return addressesService.findOne(customerIdA, created.id);
        }
      )
    ).rejects.toThrow(NotFoundException);
  });

  it('2. Enforces tenant isolation on Address Book', async () => {
    const addressData: Partial<Address> = {
      firstName: 'Alice',
      lastName: 'Smith',
      addressLine1: '789 Tenant Rd',
      city: 'Jersey City',
      country: 'USA',
      phoneNumber: '111222333',
    };

    // Create address under Tenant A
    const createdA = await tenantStorage.run(
      { tenantId: DEFAULT_TENANT_ID, slug: 'gadgets-heaven' },
      async () => {
        return addressesService.create(customerIdA, addressData);
      }
    );

    // Querying this address from Tenant B context should throw ForbiddenException due to tenant isolation subscriber
    await expect(
      tenantStorage.run(
        { tenantId: SECOND_TENANT_ID, slug: 'jersey-mania' },
        async () => {
          return addressesService.findOne(customerIdA, createdA.id);
        }
      )
    ).rejects.toThrow(ForbiddenException);
  });
});
