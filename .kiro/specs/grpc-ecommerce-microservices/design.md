# Design Document

## Overview

This design document outlines the architecture for a microservices-based e-commerce application built with NestJS and gRPC. The system follows a microservices architecture pattern with six independent services: API Gateway, Auth, User, Product, Order, and Payment. Each service is containerized using Docker and maintains its own PostgreSQL database instance, following the database-per-service pattern. Redis is used for caching and session management. The API Gateway serves as the single entry point, translating REST API requests into gRPC calls to backend services.

## Architecture

### High-Level Architecture

```mermaid
graph TB
    Client[External Clients]
    Gateway[API Gateway Service<br/>Port 3000<br/>REST API]
    
    Auth[Auth Service<br/>Port 50051<br/>gRPC]
    User[User Service<br/>Port 50052<br/>gRPC]
    Product[Product Service<br/>Port 50053<br/>gRPC]
    Order[Order Service<br/>Port 50054<br/>gRPC]
    Payment[Payment Service<br/>Port 50055<br/>gRPC]
    
    Redis[(Redis Cache<br/>Port 6379)]
    
    AuthDB[(Auth DB<br/>PostgreSQL)]
    UserDB[(User DB<br/>PostgreSQL)]
    ProductDB[(Product DB<br/>PostgreSQL)]
    OrderDB[(Order DB<br/>PostgreSQL)]
    PaymentDB[(Payment DB<br/>PostgreSQL)]
    
    Client -->|REST/HTTP| Gateway
    
    Gateway -.->|gRPC| Auth
    Gateway -.->|gRPC| User
    Gateway -.->|gRPC| Product
    Gateway -.->|gRPC| Order
    Gateway -.->|gRPC| Payment
    
    Auth --> AuthDB
    Auth --> Redis
    User --> UserDB
    Product --> ProductDB
    Product --> Redis
    Order --> OrderDB
    Order -.->|gRPC| Product
    Payment --> PaymentDB
    Payment -.->|gRPC| Order
```

### Service Communication Flow

```mermaid
sequenceDiagram
    participant Client
    participant Gateway as API Gateway
    participant Auth as Auth Service
    participant Order as Order Service
    participant Product as Product Service
    participant Payment as Payment Service
    participant Redis
    participant DB as PostgreSQL
    
    Client->>Gateway: POST /api/auth/login
    Gateway->>Auth: gRPC: Login(credentials)
    Auth->>DB: Verify credentials
    DB-->>Auth: User data
    Auth->>Redis: Store session
    Auth-->>Gateway: JWT token
    Gateway-->>Client: 200 OK + token
    
    Client->>Gateway: POST /api/orders (with JWT)
    Gateway->>Auth: gRPC: ValidateToken(token)
    Auth->>Redis: Check session
    Auth-->>Gateway: User validated
    Gateway->>Order: gRPC: CreateOrder(orderData)
    Order->>Product: gRPC: ValidateProducts(productIds)
    Product-->>Order: Product details
    Order->>DB: Create order
    Order-->>Gateway: Order created
    Gateway-->>Client: 201 Created + order
```

### Technology Stack

- **Framework**: NestJS (TypeScript)
- **Inter-service Communication**: gRPC with Protocol Buffers
- **External API**: REST API (Express via NestJS)
- **Databases**: PostgreSQL (one instance per service)
- **Cache/Session**: Redis
- **Containerization**: Docker & Docker Compose
- **Authentication**: JWT tokens

## Components and Interfaces

### 1. API Gateway Service

**Purpose**: Single entry point for external clients, REST to gRPC translation, request routing, authentication middleware

**Port**: 3000 (HTTP/REST)

**Key Components**:
- REST Controllers for each domain (Auth, User, Product, Order, Payment)
- gRPC Client connections to all backend services
- JWT validation middleware
- Request/response transformation layer
- Error handling and response formatting

**REST Endpoints**:
```
Auth:
  POST   /api/auth/register
  POST   /api/auth/login
  POST   /api/auth/refresh
  GET    /api/auth/profile

Users:
  GET    /api/users/:id
  PUT    /api/users/:id
  GET    /api/users

Products:
  GET    /api/products
  GET    /api/products/:id
  POST   /api/products
  PUT    /api/products/:id
  DELETE /api/products/:id

Orders:
  POST   /api/orders
  GET    /api/orders/:id
  GET    /api/orders/user/:userId
  PUT    /api/orders/:id/status

Payments:
  POST   /api/payments/process
  GET    /api/payments/:orderId
  POST   /api/payments/refund
```

**Dependencies**:
- gRPC clients for all backend services
- JWT library for token validation

### 2. Auth Service

**Purpose**: User authentication, authorization, token management, session handling

**Port**: 50051 (gRPC)

**Key Components**:
- gRPC Server with auth service implementation
- User registration handler
- Login/logout handlers
- Token generation and validation
- Password hashing (bcrypt)
- Session management with Redis
- Refresh token rotation

**gRPC Service Definition** (auth.proto):
```protobuf
service AuthService {
  rpc Register(RegisterRequest) returns (AuthResponse);
  rpc Login(LoginRequest) returns (AuthResponse);
  rpc RefreshToken(RefreshRequest) returns (AuthResponse);
  rpc ValidateToken(ValidateTokenRequest) returns (ValidateTokenResponse);
  rpc GetProfile(GetProfileRequest) returns (UserProfile);
}

message RegisterRequest {
  string email = 1;
  string password = 2;
  string name = 3;
}

message LoginRequest {
  string email = 1;
  string password = 2;
}

message RefreshRequest {
  string refreshToken = 1;
}

message ValidateTokenRequest {
  string token = 1;
}

message AuthResponse {
  string accessToken = 1;
  string refreshToken = 2;
  int64 expiresIn = 3;
  string userId = 4;
}

message ValidateTokenResponse {
  bool valid = 1;
  string userId = 2;
  string email = 3;
}

message GetProfileRequest {
  string userId = 1;
}

message UserProfile {
  string userId = 1;
  string email = 2;
  string name = 3;
  string createdAt = 4;
}
```

**Database Schema** (PostgreSQL):
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
```

**Redis Schema**:
```
Key: session:{userId}
Value: {
  accessToken: string,
  refreshToken: string,
  expiresAt: timestamp
}
TTL: 7 days
```

**Dependencies**:
- PostgreSQL database connection
- Redis connection
- bcrypt for password hashing
- jsonwebtoken for JWT operations

### 3. User Service

**Purpose**: User profile management, user data operations

**Port**: 50052 (gRPC)

**Key Components**:
- gRPC Server with user service implementation
- User profile CRUD operations
- User data validation
- Profile update handlers

**gRPC Service Definition** (user.proto):
```protobuf
service UserService {
  rpc GetUser(GetUserRequest) returns (User);
  rpc UpdateUser(UpdateUserRequest) returns (User);
  rpc ListUsers(ListUsersRequest) returns (ListUsersResponse);
  rpc DeleteUser(DeleteUserRequest) returns (DeleteUserResponse);
}

message GetUserRequest {
  string userId = 1;
}

message UpdateUserRequest {
  string userId = 1;
  string name = 2;
  string email = 3;
  string phone = 4;
  string address = 5;
}

message User {
  string userId = 1;
  string name = 2;
  string email = 3;
  string phone = 4;
  string address = 5;
  string createdAt = 6;
  string updatedAt = 7;
}

message ListUsersRequest {
  int32 page = 1;
  int32 limit = 2;
}

message ListUsersResponse {
  repeated User users = 1;
  int32 total = 2;
}

message DeleteUserRequest {
  string userId = 1;
}

message DeleteUserResponse {
  bool success = 1;
}
```

**Database Schema** (PostgreSQL):
```sql
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(50),
  address TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_user_profiles_email ON user_profiles(email);
```

**Dependencies**:
- PostgreSQL database connection

### 4. Product Service

**Purpose**: Product catalog management, product CRUD operations, product caching

**Port**: 50053 (gRPC)

**Key Components**:
- gRPC Server with product service implementation
- Product CRUD operations
- Product validation
- Redis caching layer for frequently accessed products
- Cache invalidation on updates

**gRPC Service Definition** (product.proto):
```protobuf
service ProductService {
  rpc CreateProduct(CreateProductRequest) returns (Product);
  rpc GetProduct(GetProductRequest) returns (Product);
  rpc UpdateProduct(UpdateProductRequest) returns (Product);
  rpc DeleteProduct(DeleteProductRequest) returns (DeleteProductResponse);
  rpc ListProducts(ListProductsRequest) returns (ListProductsResponse);
  rpc ValidateProducts(ValidateProductsRequest) returns (ValidateProductsResponse);
}

message CreateProductRequest {
  string name = 1;
  string description = 2;
  double price = 3;
  int32 stock = 4;
  string category = 5;
}

message GetProductRequest {
  string productId = 1;
}

message UpdateProductRequest {
  string productId = 1;
  string name = 2;
  string description = 3;
  double price = 4;
  int32 stock = 5;
  string category = 6;
}

message DeleteProductRequest {
  string productId = 1;
}

message Product {
  string productId = 1;
  string name = 2;
  string description = 3;
  double price = 4;
  int32 stock = 5;
  string category = 6;
  string createdAt = 7;
  string updatedAt = 8;
}

message ListProductsRequest {
  int32 page = 1;
  int32 limit = 2;
  string category = 3;
}

message ListProductsResponse {
  repeated Product products = 1;
  int32 total = 2;
}

message ValidateProductsRequest {
  repeated string productIds = 1;
}

message ValidateProductsResponse {
  repeated ProductValidation validations = 1;
}

message ProductValidation {
  string productId = 1;
  bool available = 2;
  double price = 3;
  int32 stock = 4;
}

message DeleteProductResponse {
  bool success = 1;
}
```

**Database Schema** (PostgreSQL):
```sql
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  stock INTEGER NOT NULL DEFAULT 0,
  category VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_price ON products(price);
```

**Redis Caching Strategy**:
```
Key: product:{productId}
Value: JSON serialized Product object
TTL: 1 hour

Key: products:list:{page}:{limit}:{category}
Value: JSON serialized product list
TTL: 15 minutes
```

**Dependencies**:
- PostgreSQL database connection
- Redis connection

### 5. Order Service

**Purpose**: Order management, order creation, status tracking, product validation

**Port**: 50054 (gRPC)

**Key Components**:
- gRPC Server with order service implementation
- Order creation and validation
- Order status management
- Integration with Product Service for validation
- Order calculation logic

**gRPC Service Definition** (order.proto):
```protobuf
service OrderService {
  rpc CreateOrder(CreateOrderRequest) returns (Order);
  rpc GetOrder(GetOrderRequest) returns (Order);
  rpc ListUserOrders(ListUserOrdersRequest) returns (ListOrdersResponse);
  rpc UpdateOrderStatus(UpdateOrderStatusRequest) returns (Order);
}

message CreateOrderRequest {
  string userId = 1;
  repeated OrderItem items = 2;
  string shippingAddress = 3;
}

message OrderItem {
  string productId = 1;
  int32 quantity = 2;
}

message GetOrderRequest {
  string orderId = 1;
}

message ListUserOrdersRequest {
  string userId = 1;
  int32 page = 2;
  int32 limit = 3;
}

message UpdateOrderStatusRequest {
  string orderId = 1;
  string status = 2;
}

message Order {
  string orderId = 1;
  string userId = 2;
  repeated OrderItemDetail items = 3;
  double totalAmount = 4;
  string status = 5;
  string shippingAddress = 6;
  string createdAt = 7;
  string updatedAt = 8;
}

message OrderItemDetail {
  string productId = 1;
  string productName = 2;
  int32 quantity = 3;
  double price = 4;
  double subtotal = 5;
}

message ListOrdersResponse {
  repeated Order orders = 1;
  int32 total = 2;
}
```

**Database Schema** (PostgreSQL):
```sql
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  total_amount DECIMAL(10, 2) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  shipping_address TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL,
  product_name VARCHAR(255) NOT NULL,
  quantity INTEGER NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  subtotal DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
```

**Order Status Flow**:
```
pending -> confirmed -> processing -> shipped -> delivered
                    \-> cancelled
```

**Dependencies**:
- PostgreSQL database connection
- gRPC client for Product Service

### 6. Payment Service

**Purpose**: Payment processing, refund handling, payment status tracking

**Port**: 50055 (gRPC)

**Key Components**:
- gRPC Server with payment service implementation
- Payment processing logic
- Refund processing
- Integration with Order Service
- Payment status tracking

**gRPC Service Definition** (payment.proto):
```protobuf
service PaymentService {
  rpc ProcessPayment(ProcessPaymentRequest) returns (Payment);
  rpc GetPayment(GetPaymentRequest) returns (Payment);
  rpc RefundPayment(RefundPaymentRequest) returns (Payment);
}

message ProcessPaymentRequest {
  string orderId = 1;
  string userId = 2;
  double amount = 3;
  string paymentMethod = 4;
  PaymentDetails paymentDetails = 5;
}

message PaymentDetails {
  string cardNumber = 1;
  string cardHolder = 2;
  string expiryDate = 3;
  string cvv = 4;
}

message GetPaymentRequest {
  string orderId = 1;
}

message RefundPaymentRequest {
  string paymentId = 1;
  string reason = 2;
}

message Payment {
  string paymentId = 1;
  string orderId = 2;
  string userId = 3;
  double amount = 4;
  string status = 5;
  string paymentMethod = 6;
  string transactionId = 7;
  string createdAt = 8;
  string updatedAt = 9;
}
```

**Database Schema** (PostgreSQL):
```sql
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL,
  user_id UUID NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  payment_method VARCHAR(50) NOT NULL,
  transaction_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES payments(id),
  amount DECIMAL(10, 2) NOT NULL,
  reason TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_payments_order_id ON payments(order_id);
CREATE INDEX idx_payments_user_id ON payments(user_id);
CREATE INDEX idx_refunds_payment_id ON refunds(payment_id);
```

**Payment Status Flow**:
```
pending -> processing -> completed
                     \-> failed
```

**Dependencies**:
- PostgreSQL database connection
- gRPC client for Order Service

## Data Models

### Common Patterns

All services follow these common patterns:

1. **Entity Models**: TypeScript classes/interfaces representing database entities
2. **DTO Models**: Data Transfer Objects for gRPC messages
3. **Repository Pattern**: Database access layer abstraction
4. **Service Layer**: Business logic implementation

### Data Flow

```mermaid
graph LR
    A[REST Request] --> B[Gateway Controller]
    B --> C[gRPC Client]
    C --> D[gRPC Server]
    D --> E[Service Layer]
    E --> F[Repository Layer]
    F --> G[(Database)]
    G --> F
    F --> E
    E --> D
    D --> C
    C --> B
    B --> H[REST Response]
```

## Error Handling

### Error Categories

1. **Validation Errors**: Invalid input data (400 Bad Request)
2. **Authentication Errors**: Invalid or missing credentials (401 Unauthorized)
3. **Authorization Errors**: Insufficient permissions (403 Forbidden)
4. **Not Found Errors**: Resource doesn't exist (404 Not Found)
5. **Conflict Errors**: Duplicate resources (409 Conflict)
6. **Internal Errors**: Server-side failures (500 Internal Server Error)
7. **Service Unavailable**: Downstream service failures (503 Service Unavailable)

### gRPC Error Mapping

```typescript
// API Gateway error mapping
const grpcToHttpStatus = {
  [status.OK]: 200,
  [status.INVALID_ARGUMENT]: 400,
  [status.UNAUTHENTICATED]: 401,
  [status.PERMISSION_DENIED]: 403,
  [status.NOT_FOUND]: 404,
  [status.ALREADY_EXISTS]: 409,
  [status.INTERNAL]: 500,
  [status.UNAVAILABLE]: 503,
};
```

### Error Response Format

```json
{
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "Product with ID abc123 not found",
    "details": {
      "productId": "abc123"
    },
    "timestamp": "2025-11-17T10:30:00Z"
  }
}
```

### Error Handling Strategy

1. **Service Level**: Catch and log errors, throw gRPC exceptions with appropriate status codes
2. **Gateway Level**: Catch gRPC errors, transform to HTTP responses, add correlation IDs
3. **Client Level**: Handle HTTP errors gracefully with user-friendly messages

### Retry Logic

- **Gateway to Services**: Retry on UNAVAILABLE status (max 3 attempts with exponential backoff)
- **Service to Service**: Retry on transient failures (max 2 attempts)
- **Database Operations**: Retry on connection failures (max 3 attempts)

## Testing Strategy

### Unit Testing

**Scope**: Individual components, services, and utilities

**Tools**: Jest, ts-mockito

**Coverage Target**: 80% code coverage

**Test Cases**:
- Service method logic
- Data validation
- Error handling
- Utility functions
- Repository methods (with mocked database)

### Integration Testing

**Scope**: Service-to-service communication, database operations

**Tools**: Jest, Testcontainers (for PostgreSQL and Redis)

**Test Cases**:
- gRPC service endpoints
- Database CRUD operations
- Redis caching behavior
- Service integration flows (e.g., Order → Product validation)

### End-to-End Testing

**Scope**: Complete user flows through API Gateway

**Tools**: Jest, Supertest

**Test Cases**:
- User registration and login flow
- Product browsing and creation
- Order creation and payment processing
- Order status updates
- Refund processing

### Contract Testing

**Scope**: Protocol Buffer contracts between services

**Tools**: Protobuf validation

**Test Cases**:
- Verify all services implement their proto contracts correctly
- Validate message serialization/deserialization
- Ensure backward compatibility

### Performance Testing

**Scope**: Load testing, stress testing

**Tools**: k6, Artillery

**Test Cases**:
- API Gateway throughput
- gRPC service latency
- Database query performance
- Redis cache hit rates
- Concurrent user scenarios

### Testing Environment

```yaml
# docker-compose.test.yml
services:
  postgres-test:
    image: postgres:15
    environment:
      POSTGRES_DB: test_db
      POSTGRES_USER: test_user
      POSTGRES_PASSWORD: test_pass
  
  redis-test:
    image: redis:7-alpine
```

### CI/CD Testing Pipeline

1. **Lint**: ESLint, Prettier
2. **Unit Tests**: Run all unit tests
3. **Integration Tests**: Spin up test containers, run integration tests
4. **E2E Tests**: Start all services, run E2E tests
5. **Coverage Report**: Generate and upload coverage reports
6. **Build**: Build Docker images
7. **Deploy**: Deploy to staging/production

## Infrastructure and Deployment

### Docker Configuration

Each service has its own Dockerfile:

```dockerfile
# Example: Dockerfile for any service
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package*.json ./
EXPOSE 50051
CMD ["node", "dist/main.js"]
```

### Docker Compose Configuration

```yaml
version: '3.8'

services:
  # Databases
  postgres-auth:
    image: postgres:15
    environment:
      POSTGRES_DB: auth_db
      POSTGRES_USER: auth_user
      POSTGRES_PASSWORD: auth_pass
    volumes:
      - postgres-auth-data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  postgres-user:
    image: postgres:15
    environment:
      POSTGRES_DB: user_db
      POSTGRES_USER: user_user
      POSTGRES_PASSWORD: user_pass
    volumes:
      - postgres-user-data:/var/lib/postgresql/data
    ports:
      - "5433:5432"

  postgres-product:
    image: postgres:15
    environment:
      POSTGRES_DB: product_db
      POSTGRES_USER: product_user
      POSTGRES_PASSWORD: product_pass
    volumes:
      - postgres-product-data:/var/lib/postgresql/data
    ports:
      - "5434:5432"

  postgres-order:
    image: postgres:15
    environment:
      POSTGRES_DB: order_db
      POSTGRES_USER: order_user
      POSTGRES_PASSWORD: order_pass
    volumes:
      - postgres-order-data:/var/lib/postgresql/data
    ports:
      - "5435:5432"

  postgres-payment:
    image: postgres:15
    environment:
      POSTGRES_DB: payment_db
      POSTGRES_USER: payment_user
      POSTGRES_PASSWORD: payment_pass
    volumes:
      - postgres-payment-data:/var/lib/postgresql/data
    ports:
      - "5436:5432"

  # Redis
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data

  # Microservices
  auth-service:
    build:
      context: ./services/auth
      dockerfile: Dockerfile
    environment:
      - GRPC_PORT=50051
      - DATABASE_URL=postgresql://auth_user:auth_pass@postgres-auth:5432/auth_db
      - REDIS_URL=redis://redis:6379
      - JWT_SECRET=your-secret-key
    ports:
      - "50051:50051"
    depends_on:
      - postgres-auth
      - redis

  user-service:
    build:
      context: ./services/user
      dockerfile: Dockerfile
    environment:
      - GRPC_PORT=50052
      - DATABASE_URL=postgresql://user_user:user_pass@postgres-user:5432/user_db
    ports:
      - "50052:50052"
    depends_on:
      - postgres-user

  product-service:
    build:
      context: ./services/product
      dockerfile: Dockerfile
    environment:
      - GRPC_PORT=50053
      - DATABASE_URL=postgresql://product_user:product_pass@postgres-product:5432/product_db
      - REDIS_URL=redis://redis:6379
    ports:
      - "50053:50053"
    depends_on:
      - postgres-product
      - redis

  order-service:
    build:
      context: ./services/order
      dockerfile: Dockerfile
    environment:
      - GRPC_PORT=50054
      - DATABASE_URL=postgresql://order_user:order_pass@postgres-order:5432/order_db
      - PRODUCT_SERVICE_URL=product-service:50053
    ports:
      - "50054:50054"
    depends_on:
      - postgres-order
      - product-service

  payment-service:
    build:
      context: ./services/payment
      dockerfile: Dockerfile
    environment:
      - GRPC_PORT=50055
      - DATABASE_URL=postgresql://payment_user:payment_pass@postgres-payment:5432/payment_db
      - ORDER_SERVICE_URL=order-service:50054
    ports:
      - "50055:50055"
    depends_on:
      - postgres-payment
      - order-service

  api-gateway:
    build:
      context: ./services/api-gateway
      dockerfile: Dockerfile
    environment:
      - HTTP_PORT=3000
      - AUTH_SERVICE_URL=auth-service:50051
      - USER_SERVICE_URL=user-service:50052
      - PRODUCT_SERVICE_URL=product-service:50053
      - ORDER_SERVICE_URL=order-service:50054
      - PAYMENT_SERVICE_URL=payment-service:50055
    ports:
      - "3000:3000"
    depends_on:
      - auth-service
      - user-service
      - product-service
      - order-service
      - payment-service

volumes:
  postgres-auth-data:
  postgres-user-data:
  postgres-product-data:
  postgres-order-data:
  postgres-payment-data:
  redis-data:
```

### Environment Variables

Each service uses environment variables for configuration:

- Database connection strings
- Redis connection strings
- gRPC service URLs
- JWT secrets
- Port configurations

### Health Checks

Each service implements health check endpoints:

```typescript
// Health check implementation
@Controller('health')
export class HealthController {
  @Get()
  check() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'auth-service',
    };
  }
}
```

### Logging

Centralized logging strategy:

- **Format**: JSON structured logs
- **Levels**: ERROR, WARN, INFO, DEBUG
- **Fields**: timestamp, service, level, message, correlationId, metadata
- **Transport**: Console (can be extended to ELK stack)

### Monitoring

Key metrics to monitor:

- Request rate and latency
- Error rates
- gRPC call success/failure rates
- Database connection pool status
- Redis cache hit/miss rates
- Service health status

## Security Considerations

### Authentication & Authorization

- JWT-based authentication
- Token expiration and refresh mechanism
- Role-based access control (can be extended)
- Secure password hashing with bcrypt

### Data Protection

- Sensitive data encryption at rest
- TLS for gRPC communication (production)
- Environment variable management for secrets
- Input validation and sanitization

### API Security

- Rate limiting (can be implemented at gateway)
- CORS configuration
- Request size limits
- SQL injection prevention (parameterized queries)

### Network Security

- Service-to-service communication within Docker network
- Exposed ports limited to necessary services
- Database access restricted to service containers
