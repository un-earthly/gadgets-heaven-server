import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../../app.module';
import { CartService } from './cart.service';
import { Cart, CartStatus } from './entities/cart.entity';
import { CartItem } from './entities/cart-item.entity';
import { Product } from '../products/entities/product.entity';
import { ProductVariant } from '../products/entities/product-variant.entity';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { INestApplication, BadRequestException } from '@nestjs/common';
import { tenantStorage } from '../tenants/tenant.context';
import { DEFAULT_TENANT_ID } from '../tenants/tenants.service';

import { User, UserRole } from '../users/entities/user.entity';

describe('Cart Integration Tests', () => {
  jest.setTimeout(30000);
  let module: TestingModule;
  let app: INestApplication;
  let cartService: CartService;
  let cartRepository: Repository<Cart>;
  let cartItemRepository: Repository<CartItem>;
  let productRepository: Repository<Product>;
  let variantRepository: Repository<ProductVariant>;
  let userRepository: Repository<User>;

  const customerId = '123e4567-e89b-12d3-a456-426614174003';
  const guestSessionId = '123e4567-e89b-12d3-a456-426614174004';
  let testProduct: Product;
  let testVariant: ProductVariant;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module.createNestApplication();
    await app.init();

    cartService = module.get<CartService>(CartService);
    cartRepository = module.get<Repository<Cart>>(getRepositoryToken(Cart));
    cartItemRepository = module.get<Repository<CartItem>>(getRepositoryToken(CartItem));
    productRepository = module.get<Repository<Product>>(getRepositoryToken(Product));
    variantRepository = module.get<Repository<ProductVariant>>(getRepositoryToken(ProductVariant));
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));

      // Ensure customer user exists
    await tenantStorage.run({ tenantId: DEFAULT_TENANT_ID, slug: 'gadgets-heaven' }, async () => {
      // Clean up previous runs if they weren't cleaned up due to failures
      await variantRepository.delete({ sku: 'TEST-PHONE-RED' });
      await productRepository.delete({ name: 'Cart Test Phone' });

      let user = await userRepository.findOne({ where: { id: customerId } });
      if (!user) {
        user = userRepository.create({
          id: customerId,
          email: 'cartcustomer@example.com',
          password: 'password',
          role: UserRole.CUSTOMER,
          firstName: 'Cart',
          lastName: 'Customer',
        });
        await userRepository.save(user);
      }

      // Setup a test product and variant
      testProduct = productRepository.create({
        name: 'Cart Test Phone',
        description: 'Testing phone description',
        price: 999.99,
        stockQuantity: 5,
        categories: ['Smartphones'],
      });
      await productRepository.save(testProduct);

      testVariant = variantRepository.create({
        productId: testProduct.id,
        sku: 'TEST-PHONE-RED',
        attributes: { color: 'Red' },
        stockQuantity: 2,
        priceOverride: 1049.99,
      });
      await variantRepository.save(testVariant);
    });
  });

  afterAll(async () => {
    await tenantStorage.run({ tenantId: DEFAULT_TENANT_ID, slug: 'gadgets-heaven' }, async () => {
      // Delete cart items and carts first to avoid FK constraints on delete
      const customerCart = await cartRepository.findOne({ where: { userId: customerId } });
      if (customerCart) {
        await cartItemRepository.delete({ cartId: customerCart.id });
        await cartRepository.delete(customerCart.id);
      }
      const guestCart = await cartRepository.findOne({ where: { guestSessionId } });
      if (guestCart) {
        await cartItemRepository.delete({ cartId: guestCart.id });
        await cartRepository.delete(guestCart.id);
      }

      if (testVariant && testVariant.id) await variantRepository.delete(testVariant.id);
      if (testProduct && testProduct.id) await productRepository.delete(testProduct.id);
      await userRepository.delete(customerId);
    });
    if (app) {
      await app.close();
    }
  });

  beforeEach(async () => {
    await tenantStorage.run({ tenantId: DEFAULT_TENANT_ID, slug: 'gadgets-heaven' }, async () => {
      // Clean carts for test customer and guest using guestSessionId
      const customerCart = await cartRepository.findOne({ where: { userId: customerId } });
      if (customerCart) {
        await cartItemRepository.delete({ cartId: customerCart.id });
        await cartRepository.delete(customerCart.id);
      }
      const guestCart = await cartRepository.findOne({ where: { guestSessionId } });
      if (guestCart) {
        await cartItemRepository.delete({ cartId: guestCart.id });
        await cartRepository.delete(guestCart.id);
      }
    });
  });

  it('1. Guest cart handles addition and is marked as guest cart', async () => {
    const result = await tenantStorage.run(
      { tenantId: DEFAULT_TENANT_ID, slug: 'gadgets-heaven' },
      async () => {
        return cartService.addItem(guestSessionId, {
          productId: testProduct.id,
          variantId: testVariant.id,
          quantity: 1,
        });
      }
    );

    expect(result.id).toBeDefined();
    expect(result.isGuestCart).toBe(true);
    expect(result.items.length).toBe(1);
    expect(result.items[0].variantId).toBe(testVariant.id);
  });

  it('2. Blocks adding quantity exceeding available stock', async () => {
    await expect(
      tenantStorage.run(
        { tenantId: DEFAULT_TENANT_ID, slug: 'gadgets-heaven' },
        async () => {
          return cartService.addItem(guestSessionId, {
            productId: testProduct.id,
            variantId: testVariant.id,
            quantity: 3, // Variant only has stockQuantity 2
          });
        }
      )
    ).rejects.toThrow(BadRequestException);
  });

  it('3. Successfully merges guest cart into customer cart upon login', async () => {
    // 1. Add item to guest cart
    await tenantStorage.run(
      { tenantId: DEFAULT_TENANT_ID, slug: 'gadgets-heaven' },
      async () => {
        await cartService.addItem(guestSessionId, {
          productId: testProduct.id,
          variantId: testVariant.id,
          quantity: 1,
        });
      }
    );

    // 2. Perform merge
    const mergedCart = await tenantStorage.run(
      { tenantId: DEFAULT_TENANT_ID, slug: 'gadgets-heaven' },
      async () => {
        return cartService.mergeCart(customerId, guestSessionId);
      }
    );

    expect(mergedCart.isGuestCart).toBe(false);
    expect(mergedCart.userId).toBe(customerId);
    expect(mergedCart.items.length).toBe(1);
    expect(mergedCart.items[0].productId).toBe(testProduct.id);
    expect(mergedCart.items[0].quantity).toBe(1);

    // 3. Verify guest cart is cleared
    const guestCart = await tenantStorage.run(
      { tenantId: DEFAULT_TENANT_ID, slug: 'gadgets-heaven' },
      async () => {
        return cartService.getActiveCart(guestSessionId);
      }
    );
    expect(guestCart.items.length).toBe(0);
  });
});
