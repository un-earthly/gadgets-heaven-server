import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../../app.module';
import { OrdersService } from './orders.service';
import { Order, OrderStatus, OrderPaymentStatus, PaymentType } from './entities/order.entity';
import { Product } from '../products/entities/product.entity';
import { ProductVariant } from '../products/entities/product-variant.entity';
import { Cart, CartStatus } from '../cart/entities/cart.entity';
import { CartItem } from '../cart/entities/cart-item.entity';
import { Address } from '../users/entities/address.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { CourierService } from '../couriers/courier.interface';
import { PaymentGatewayService } from '../payments/gateways/payment-gateway.interface';
import { NotificationsService } from '../notifications/services/notifications.service';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { INestApplication } from '@nestjs/common';
import { tenantStorage } from '../tenants/tenant.context';
import { DEFAULT_TENANT_ID, TenantsService } from '../tenants/tenants.service';
import { Tenant } from '../tenants/entities/tenant.entity';
import { encryptSecret } from '../../common/crypto.util';
import { PaymentsService } from '../payments/payments.service';
import { Payment, PaymentStatus } from '../payments/entities/payment.entity';
import { Transaction } from '../finance/entities/transaction.entity';

describe('Orders Checkout & Flow Integration Tests', () => {
  jest.setTimeout(30000);
  let module: TestingModule;
  let app: INestApplication;
  let ordersService: OrdersService;
  let paymentsService: PaymentsService;
  let orderRepository: Repository<Order>;
  let productRepository: Repository<Product>;
  let variantRepository: Repository<ProductVariant>;
  let cartRepository: Repository<Cart>;
  let cartItemRepository: Repository<CartItem>;
  let addressRepository: Repository<Address>;
  let userRepository: Repository<User>;
  let paymentRepository: Repository<Payment>;
  let transactionRepository: Repository<Transaction>;
  let tenantRepository: Repository<Tenant>;

  let courierService: CourierService;
  let gatewayService: PaymentGatewayService;
  let notificationsService: NotificationsService;

  const customerId = '321e4567-e89b-12d3-a456-426614174003';
  let testAddress: Address;
  let testProduct: Product;
  let testVariant: ProductVariant;
  let testCart: Cart;

  beforeAll(async () => {
    process.env.CREDENTIALS_ENCRYPTION_KEY = 'test-key-32-chars-long-must-be-unique-123';
    module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module.createNestApplication();
    await app.init();

    ordersService = module.get<OrdersService>(OrdersService);
    paymentsService = module.get<PaymentsService>(PaymentsService);
    orderRepository = module.get<Repository<Order>>(getRepositoryToken(Order));
    productRepository = module.get<Repository<Product>>(getRepositoryToken(Product));
    variantRepository = module.get<Repository<ProductVariant>>(getRepositoryToken(ProductVariant));
    cartRepository = module.get<Repository<Cart>>(getRepositoryToken(Cart));
    cartItemRepository = module.get<Repository<CartItem>>(getRepositoryToken(CartItem));
    addressRepository = module.get<Repository<Address>>(getRepositoryToken(Address));
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    paymentRepository = module.get<Repository<Payment>>(getRepositoryToken(Payment));
    transactionRepository = module.get<Repository<Transaction>>(getRepositoryToken(Transaction));
    tenantRepository = module.get<Repository<Tenant>>(getRepositoryToken(Tenant));

    courierService = module.get<CourierService>(CourierService);
    gatewayService = module.get<PaymentGatewayService>(PaymentGatewayService);
    notificationsService = module.get<NotificationsService>(NotificationsService);

    // Setup user, address, products, and cart
    await tenantStorage.run({ tenantId: DEFAULT_TENANT_ID, slug: 'gadgets-heaven' }, async () => {
      // Clean up previous runs
      const oldVariant = await variantRepository.findOne({ where: { sku: 'ORDER-TEST-SKU' } });
      if (oldVariant) {
        await cartItemRepository.delete({ variantId: oldVariant.id });
      }
      const oldProduct = await productRepository.findOne({ where: { name: 'Order Test Item' } });
      if (oldProduct) {
        await cartItemRepository.delete({ productId: oldProduct.id });
      }
      
      const orders = await orderRepository.find({ where: { userId: customerId } });
      for (const order of orders) {
        await transactionRepository.delete({ orderId: order.id });
        await paymentRepository.delete({ orderId: order.id });
        await orderRepository.delete(order.id);
      }

      const carts = await cartRepository.find({ where: { userId: customerId } });
      for (const cart of carts) {
        await cartItemRepository.delete({ cartId: cart.id });
        await cartRepository.delete(cart.id);
      }

      await variantRepository.delete({ sku: 'ORDER-TEST-SKU' });
      await productRepository.delete({ name: 'Order Test Item' });
      await addressRepository.delete({ phoneNumber: '01700000000' });

      // Save encrypted merchant credentials for the test
      const tenant = await tenantRepository.findOne({ where: { id: DEFAULT_TENANT_ID } });
      if (tenant) {
        tenant.sslcommerzStoreId = 'MOCK_STORE_ID';
        tenant.sslcommerzStorePassword = encryptSecret('MOCK_STORE_PASSWORD');
        tenant.steadfastApiKey = encryptSecret('MOCK_STEADFAST_API_KEY');
        tenant.steadfastSecretKey = encryptSecret('MOCK_STEADFAST_SECRET_KEY');
        tenant.activeCourier = 'steadfast';
        await tenantRepository.save(tenant);
      }

      let user = await userRepository.findOne({ where: { id: customerId } });
      if (!user) {
        user = userRepository.create({
          id: customerId,
          email: 'ordercustomer@example.com',
          password: 'password',
          role: UserRole.CUSTOMER,
          firstName: 'Order',
          lastName: 'Customer',
        });
        await userRepository.save(user);
      }

      testAddress = addressRepository.create({
        userId: customerId,
        firstName: 'Recipient',
        lastName: 'Name',
        addressLine1: '123 E-Commerce Way',
        city: 'Dhaka',
        country: 'Bangladesh',
        phoneNumber: '01700000000',
        isDefault: true,
      });
      await addressRepository.save(testAddress);

      testProduct = productRepository.create({
        name: 'Order Test Item',
        description: 'Testing orders description',
        price: 500.00,
        stockQuantity: 10,
        categories: ['Gadgets'],
      });
      await productRepository.save(testProduct);

      testVariant = variantRepository.create({
        productId: testProduct.id,
        sku: 'ORDER-TEST-SKU',
        attributes: { color: 'Blue' },
        stockQuantity: 5,
        priceOverride: 550.00,
      });
      await variantRepository.save(testVariant);
    });
  });

  afterAll(async () => {
    await tenantStorage.run({ tenantId: DEFAULT_TENANT_ID, slug: 'gadgets-heaven' }, async () => {
      // Tear down order details first to avoid FK constraints
      const orders = await orderRepository.find({ where: { userId: customerId } });
      for (const order of orders) {
        await transactionRepository.delete({ orderId: order.id });
        await paymentRepository.delete({ orderId: order.id });
        await orderRepository.delete(order.id);
      }
      
      const carts = await cartRepository.find({ where: { userId: customerId } });
      for (const cart of carts) {
        await cartItemRepository.delete({ cartId: cart.id });
        await cartRepository.delete(cart.id);
      }

      await addressRepository.delete({ userId: customerId });
      await variantRepository.delete({ sku: 'ORDER-TEST-SKU' });
      await productRepository.delete({ name: 'Order Test Item' });
      await userRepository.delete({ id: customerId });
    });
    await app.close();
  });

  beforeEach(async () => {
    // Reset/recreate clean active cart for tests
    await tenantStorage.run({ tenantId: DEFAULT_TENANT_ID, slug: 'gadgets-heaven' }, async () => {
      testVariant.priceOverride = 550.00;
      await variantRepository.save(testVariant);

      testAddress.addressLine1 = '123 E-Commerce Way';
      await addressRepository.save(testAddress);

      const existingCart = await cartRepository.findOne({ where: { userId: customerId } });
      if (existingCart) {
        await cartItemRepository.delete({ cartId: existingCart.id });
        await cartRepository.delete(existingCart.id);
      }

      testCart = cartRepository.create({
        userId: customerId,
        tenantId: DEFAULT_TENANT_ID,
        status: CartStatus.ACTIVE,
        subtotal: 0,
        tax: 0,
        total: 0,
      });
      await cartRepository.save(testCart);

      const cartItem = cartItemRepository.create({
        cartId: testCart.id,
        productId: testProduct.id,
        variantId: testVariant.id,
        quantity: 2,
        unitPrice: 550.00,
        subtotal: 1100.00,
      });
      await cartItemRepository.save(cartItem);

      testCart.items = [cartItem];
      testCart.subtotal = 1100.00;
      testCart.total = 1100.00;
      await cartRepository.save(testCart);
    });
  });

  it('STEP 1 & 2 & 4: should create order from cart, snapshot address & prices, and trigger WhatsApp notification & Steadfast for COD', async () => {
    // Spy on Steadfast Courier consignment creation
    const courierSpy = jest.spyOn(courierService, 'createConsignment').mockResolvedValue({
      consignmentId: 'STEADFAST-12345',
      trackingCode: 'TRACK-12345',
      status: 'in_review',
    });

    // Spy on WhatsApp notifications
    const whatsappSpy = jest.spyOn(notificationsService, 'sendWhatsAppEvent').mockResolvedValue({ success: true, error: null } as any);

    await tenantStorage.run({ tenantId: DEFAULT_TENANT_ID, slug: 'gadgets-heaven' }, async () => {
      // 1. Create COD Order
      const order = await ordersService.createOrderFromCart(
        customerId,
        testCart.id,
        testAddress.id,
        'cod',
      );

      expect(order).toBeDefined();
      expect(Number(order.subtotal)).toEqual(1100.00);
      expect(Number(order.shippingCost)).toEqual(100.00);
      expect(Number(order.totalAmount)).toEqual(1200.00);
      expect(order.paymentMethod).toBe('cod');
      expect(order.paymentType).toBe(PaymentType.COD);
      expect(order.status).toBe(OrderStatus.PROCESSING); // COD orders go straight to processing
      expect(order.consignmentId).toBe('STEADFAST-12345');
      expect(order.trackingNumber).toBe('TRACK-12345');

      // Verify that formatting snapshot of address was saved
      expect(order.shippingAddress).toContain('Recipient Name');
      expect(order.shippingAddress).toContain('123 E-Commerce Way');
      expect(order.shippingAddress).toContain('Dhaka');
      expect(order.shippingAddress).toContain('Phone: 01700000000');

      // Verify that WhatsApp notifications fired
      expect(whatsappSpy).toHaveBeenCalled();

      // Verify that mutating original address and variant price does not affect the order
      testAddress.addressLine1 = '999 Mutated Boulevard';
      await addressRepository.save(testAddress);

      testVariant.priceOverride = 9999.00;
      await variantRepository.save(testVariant);

      const orderVerify = await orderRepository.findOne({ where: { id: order.id } });
      expect(orderVerify!.shippingAddress).toContain('123 E-Commerce Way');
      expect(orderVerify!.shippingAddress).not.toContain('Mutated Boulevard');
      expect(Number(orderVerify!.items[0].price)).toEqual(550.00);
    });

    courierSpy.mockRestore();
    whatsappSpy.mockRestore();
  });

  it('STEP 3: should handle SSLCommerz online payment flow from pending to paid and dispatch to courier on callback', async () => {
    const courierSpy = jest.spyOn(courierService, 'createConsignment').mockResolvedValue({
      consignmentId: 'STEADFAST-ONLINE-54321',
      trackingCode: 'TRACK-ONLINE-54321',
      status: 'in_review',
    });

    const gatewayInitSpy = jest.spyOn(gatewayService, 'initiatePayment').mockResolvedValue({
      redirectUrl: 'https://sandbox.sslcommerz.com/checkout/mock-session-id',
      sessionKey: 'MOCK-SESSION-KEY',
    });

    const gatewayValidateSpy = jest.spyOn(gatewayService, 'validatePayment').mockResolvedValue({
      valid: true,
      status: 'paid',
      gatewayTransactionId: 'GATEWAY-TXN-999',
      amount: 1200.00,
    });

    await tenantStorage.run({ tenantId: DEFAULT_TENANT_ID, slug: 'gadgets-heaven' }, async () => {
      // 1. Create Online Order
      const order = await ordersService.createOrderFromCart(
        customerId,
        testCart.id,
        testAddress.id,
        'sslcommerz',
      );

      expect(order.status).toBe(OrderStatus.PENDING);
      expect(order.paymentStatus).toBe(OrderPaymentStatus.PENDING);
      expect(order.paymentType).toBe(PaymentType.ONLINE);

      // 2. Initiate Online Payment Session
      const initResult = await paymentsService.initiateOnlinePayment(
        customerId,
        order.id,
        { name: 'Recipient Name', email: 'ordercustomer@example.com', phone: '01700000000' }
      );

      expect(initResult.redirectUrl).toBe('https://sandbox.sslcommerz.com/checkout/mock-session-id');
      expect(gatewayInitSpy).toHaveBeenCalled();

      // Find the pending payment
      const payment = await paymentRepository.findOne({ where: { id: initResult.paymentId } });
      expect(payment).toBeDefined();
      expect(payment!.status).toBe(PaymentStatus.PENDING);

      console.log('TEST DEBUG - payment.amount:', payment!.amount, 'type:', typeof payment!.amount);

      // 3. Process Success Callback (simulating gateway notification)
      const callbackResult = await paymentsService.processGatewayNotification(
        'gadgets-heaven',
        { tran_id: payment!.transactionId, val_id: 'GATEWAY-VAL-ID-MOCK' }
      );

      expect(callbackResult.status).toBe('paid');

      // Verify that the order transitions to paid & processing, and courier consignment is created
      const orderVerify = await orderRepository.findOne({ where: { id: order.id } });
      expect(orderVerify!.isPaid).toBe(true);
      expect(orderVerify!.paymentStatus).toBe(OrderPaymentStatus.PAID);
      expect(orderVerify!.status).toBe(OrderStatus.PROCESSING);
      expect(orderVerify!.consignmentId).toBe('STEADFAST-ONLINE-54321');
      expect(orderVerify!.trackingNumber).toBe('TRACK-ONLINE-54321');
    });

    courierSpy.mockRestore();
    gatewayInitSpy.mockRestore();
    gatewayValidateSpy.mockRestore();
  });
});
