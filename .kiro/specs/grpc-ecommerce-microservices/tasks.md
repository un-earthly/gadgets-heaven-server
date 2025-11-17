# Implementation Plan

- [x] 1. Set up project structure and Protocol Buffer definitions
  - Create monorepo structure with separate directories for each service (api-gateway, auth, user, product, order, payment)
  - Create shared proto directory for Protocol Buffer definitions
  - Define all .proto files for service contracts (auth.proto, user.proto, product.proto, order.proto, payment.proto)
  - Set up package.json files for each service with NestJS and gRPC dependencies
  - Configure TypeScript for all services
  - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6_

- [x] 2. Implement Auth Service core functionality
  - [x] 2.1 Set up Auth Service NestJS application structure
    - Initialize NestJS application with gRPC transport
    - Configure database connection to PostgreSQL
    - Configure Redis connection for session management
    - Set up environment variable configuration
    - _Requirements: 14.1, 16.1_
  
  - [x] 2.2 Implement user registration functionality
    - Create user entity and repository
    - Implement password hashing with bcrypt
    - Implement registration handler with validation
    - Store user credentials in PostgreSQL database
    - _Requirements: 1.1, 1.3, 1.5_
  
  - [x] 2.3 Implement login and token generation
    - Implement login handler with credential verification
    - Generate JWT access and refresh tokens
    - Store session data in Redis with expiration
    - _Requirements: 2.1, 2.2, 2.5_
  
  - [x] 2.4 Implement token refresh and validation
    - Implement refresh token handler with Redis validation
    - Implement token validation endpoint for gateway
    - Handle token expiration and rotation
    - _Requirements: 3.1, 3.2, 3.3_
  
  - [x] 2.5 Implement profile retrieval
    - Create endpoint to fetch user profile data
    - _Requirements: 4.1_
  
  - [ ]* 2.6 Write unit tests for Auth Service
    - Test registration logic with valid and invalid inputs
    - Test login with correct and incorrect credentials
    - Test token generation and validation
    - Test Redis session management
    - _Requirements: 1.1, 2.1, 3.1_

- [x] 3. Implement User Service core functionality
  - [x] 3.1 Set up User Service NestJS application structure
    - Initialize NestJS application with gRPC transport
    - Configure database connection to PostgreSQL
    - Set up environment variable configuration
    - _Requirements: 14.2_
  
  - [x] 3.2 Implement user profile management
    - Create user profile entity and repository
    - Implement get user profile handler
    - Implement update user profile handler with validation
    - Implement list users handler with pagination
    - _Requirements: 4.1, 4.2, 4.5_
  
  - [ ]* 3.3 Write unit tests for User Service
    - Test profile retrieval
    - Test profile updates
    - Test user listing with pagination
    - _Requirements: 4.1, 4.2_

- [x] 4. Implement Product Service core functionality
  - [x] 4.1 Set up Product Service NestJS application structure
    - Initialize NestJS application with gRPC transport
    - Configure database connection to PostgreSQL
    - Configure Redis connection for caching
    - Set up environment variable configuration
    - _Requirements: 14.3, 16.2_
  
  - [x] 4.2 Implement product CRUD operations
    - Create product entity and repository
    - Implement create product handler
    - Implement get product handler with Redis caching
    - Implement update product handler with cache invalidation
    - Implement delete product handler with cache invalidation
    - Implement list products handler with pagination and caching
    - _Requirements: 5.1, 5.2, 5.5, 6.1, 6.2, 6.3_
  
  - [x] 4.3 Implement product validation for orders
    - Create validate products endpoint for Order Service
    - Return product availability, price, and stock information
    - _Requirements: 7.2_
  
  - [ ]* 4.4 Write unit tests for Product Service
    - Test product creation
    - Test product retrieval with caching
    - Test product updates and cache invalidation
    - Test product deletion
    - Test product validation endpoint
    - _Requirements: 5.1, 6.1, 7.2_

- [x] 5. Implement Order Service core functionality
  - [x] 5.1 Set up Order Service NestJS application structure
    - Initialize NestJS application with gRPC transport
    - Configure database connection to PostgreSQL
    - Configure gRPC client for Product Service
    - Set up environment variable configuration
    - _Requirements: 14.4_
  
  - [x] 5.2 Implement order creation with product validation
    - Create order and order items entities and repositories
    - Implement gRPC call to Product Service for validation
    - Calculate order total based on product prices
    - Store order and order items in PostgreSQL
    - Set initial order status to 'pending'
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_
  
  - [x] 5.3 Implement order retrieval and listing
    - Implement get order by ID handler
    - Implement list orders by user ID handler with pagination
    - Ensure users can only access their own orders
    - _Requirements: 8.1, 8.2, 8.5_
  
  - [x] 5.4 Implement order status updates
    - Create update order status handler
    - Validate status transitions
    - _Requirements: 9.1, 9.3_
  
  - [ ]* 5.5 Write unit tests for Order Service
    - Test order creation with product validation
    - Test order total calculation
    - Test order retrieval
    - Test order status updates
    - _Requirements: 7.1, 8.1, 9.1_

- [x] 6. Implement Payment Service core functionality
  - [x] 6.1 Set up Payment Service NestJS application structure
    - Initialize NestJS application with gRPC transport
    - Configure database connection to PostgreSQL
    - Configure gRPC client for Order Service
    - Set up environment variable configuration
    - _Requirements: 14.5_
  
  - [x] 6.2 Implement payment processing
    - Create payment and refund entities and repositories
    - Implement payment processing handler
    - Validate order via gRPC call to Order Service
    - Store payment record in PostgreSQL
    - Notify Order Service to update order status on success
    - _Requirements: 10.1, 10.2, 10.3, 10.4_
  
  - [x] 6.3 Implement payment retrieval
    - Create get payment by order ID handler
    - Ensure users can only access their own payment information
    - _Requirements: 11.1, 11.3_
  
  - [x] 6.4 Implement refund processing
    - Create refund processing handler
    - Validate payment eligibility for refund
    - Store refund record in PostgreSQL
    - Notify Order Service to update order status
    - _Requirements: 12.1, 12.2, 12.3, 12.4_
  
  - [ ]* 6.5 Write unit tests for Payment Service
    - Test payment processing
    - Test payment retrieval
    - Test refund processing
    - _Requirements: 10.1, 11.1, 12.1_

- [x] 7. Implement API Gateway Service
  - [x] 7.1 Set up API Gateway NestJS application structure
    - Initialize NestJS application with HTTP transport
    - Configure gRPC clients for all backend services
    - Set up environment variable configuration
    - _Requirements: 13.1_
  
  - [x] 7.2 Implement authentication endpoints
    - Create REST controller for auth routes
    - Implement POST /api/auth/register endpoint
    - Implement POST /api/auth/login endpoint
    - Implement POST /api/auth/refresh endpoint
    - Implement GET /api/auth/profile endpoint
    - Translate REST requests to gRPC calls to Auth Service
    - _Requirements: 1.4, 2.4, 3.4_
  
  - [x] 7.3 Implement JWT authentication middleware
    - Create middleware to validate JWT tokens
    - Call Auth Service to validate tokens via gRPC
    - Attach user information to request context
    - _Requirements: 2.4_
  
  - [x] 7.4 Implement user management endpoints
    - Create REST controller for user routes
    - Implement GET /api/users/:id endpoint with auth middleware
    - Implement PUT /api/users/:id endpoint with auth middleware
    - Implement GET /api/users endpoint with auth middleware
    - Translate REST requests to gRPC calls to User Service
    - _Requirements: 4.3, 4.4_
  
  - [x] 7.5 Implement product management endpoints
    - Create REST controller for product routes
    - Implement GET /api/products endpoint
    - Implement GET /api/products/:id endpoint
    - Implement POST /api/products endpoint with auth middleware
    - Implement PUT /api/products/:id endpoint with auth middleware
    - Implement DELETE /api/products/:id endpoint with auth middleware
    - Translate REST requests to gRPC calls to Product Service
    - _Requirements: 5.3, 5.4, 6.4, 6.5, 6.6_
  
  - [x] 7.6 Implement order management endpoints
    - Create REST controller for order routes
    - Implement POST /api/orders endpoint with auth middleware
    - Implement GET /api/orders/:id endpoint with auth middleware
    - Implement GET /api/orders/user/:userId endpoint with auth middleware
    - Implement PUT /api/orders/:id/status endpoint with auth middleware
    - Translate REST requests to gRPC calls to Order Service
    - _Requirements: 7.4, 8.3, 8.4_
  
  - [x] 7.7 Implement payment management endpoints
    - Create REST controller for payment routes
    - Implement POST /api/payments/process endpoint with auth middleware
    - Implement GET /api/payments/:orderId endpoint with auth middleware
    - Implement POST /api/payments/refund endpoint with auth middleware
    - Translate REST requests to gRPC calls to Payment Service
    - _Requirements: 10.5, 11.2, 12.5_
  
  - [x] 7.8 Implement error handling and response transformation
    - Create global exception filter
    - Map gRPC errors to HTTP status codes
    - Format error responses consistently
    - Add correlation IDs for request tracking
    - _Requirements: 13.1_
  
  - [ ]* 7.9 Write integration tests for API Gateway
    - Test all REST endpoints with mocked gRPC services
    - Test authentication middleware
    - Test error handling and transformation
    - _Requirements: 1.4, 2.4, 4.3, 5.3, 7.4, 10.5_

- [x] 8. Create Docker configuration for all services
  - [x] 8.1 Create Dockerfiles for each service
    - Write Dockerfile for Auth Service
    - Write Dockerfile for User Service
    - Write Dockerfile for Product Service
    - Write Dockerfile for Order Service
    - Write Dockerfile for Payment Service
    - Write Dockerfile for API Gateway
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5, 15.6_
  
  - [x] 8.2 Create Docker Compose configuration
    - Define PostgreSQL services for each microservice
    - Define Redis service
    - Define all microservice containers
    - Configure environment variables
    - Set up service dependencies
    - Configure networking between containers
    - _Requirements: 15.7, 14.1, 14.2, 14.3, 14.4, 14.5, 16.3_
  
  - [x] 8.3 Create database initialization scripts
    - Write SQL migration scripts for Auth database schema
    - Write SQL migration scripts for User database schema
    - Write SQL migration scripts for Product database schema
    - Write SQL migration scripts for Order database schema
    - Write SQL migration scripts for Payment database schema
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5_

- [x] 9. Implement Redis caching strategy
  - [x] 9.1 Implement caching in Product Service
    - Add cache layer for product retrieval
    - Implement cache invalidation on product updates
    - Set appropriate TTL for cached data
    - _Requirements: 16.2, 16.4_
  
  - [x] 9.2 Implement session management in Auth Service
    - Store session data in Redis on login
    - Validate sessions from Redis on token refresh
    - Set session expiration times
    - _Requirements: 16.1_

- [ ]* 10. Write end-to-end tests
  - Set up test environment with Docker Compose
  - Write E2E test for user registration and login flow
  - Write E2E test for product browsing and creation
  - Write E2E test for order creation and payment processing
  - Write E2E test for refund processing
  - _Requirements: 1.1, 2.1, 5.1, 7.1, 10.1, 12.1_

- [ ] 11. Create project documentation
  - [x] 11.1 Write README with setup instructions
    - Document prerequisites (Node.js, Docker, Docker Compose)
    - Provide installation steps
    - Document how to run services locally
    - Document API endpoints
    - _Requirements: All_
  
  - [x] 11.2 Create API documentation
    - Document all REST API endpoints with examples
    - Include request/response formats
    - Document authentication requirements
    - _Requirements: All_
  
  - [ ]* 11.3 Create architecture documentation
    - Document service architecture
    - Create deployment guide
    - Document troubleshooting steps
    - _Requirements: All_
