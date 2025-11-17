# gRPC E-Commerce Microservices

A production-ready, scalable e-commerce platform built with gRPC microservices architecture using NestJS, TypeScript, and Docker.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Features](#features)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Installation](#installation)
- [Running the Application](#running-the-application)
- [API Documentation](#api-documentation)
- [Project Structure](#project-structure)
- [Technology Stack](#technology-stack)
- [Development](#development)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)

## Overview

This project demonstrates a complete microservices-based e-commerce application with the following characteristics:

- **Microservices Architecture**: Six independent services communicating via gRPC
- **Database per Service**: Each microservice has its own PostgreSQL database
- **API Gateway Pattern**: Single entry point for REST API clients
- **Caching Layer**: Redis for session management and product caching
- **Containerization**: Full Docker support with Docker Compose orchestration
- **Type Safety**: End-to-end TypeScript with Protocol Buffers

## Architecture

### High-Level Architecture

```
┌─────────────┐
│   Clients   │
└──────┬──────┘
       │ REST/HTTP
       ▼
┌─────────────────┐
│  API Gateway    │ (Port 3000)
│  REST → gRPC    │
└────────┬────────┘
         │ gRPC
    ┌────┴────┬────────┬────────┬─────────┐
    ▼         ▼        ▼        ▼         ▼
┌────────┐ ┌──────┐ ┌─────────┐ ┌───────┐ ┌─────────┐
│  Auth  │ │ User │ │ Product │ │ Order │ │ Payment │
│ :50051 │ │:50052│ │ :50053  │ │:50054 │ │ :50055  │
└───┬────┘ └──┬───┘ └────┬────┘ └───┬───┘ └────┬────┘
    │         │          │           │          │
    ▼         ▼          ▼           ▼          ▼
┌────────┐ ┌──────┐ ┌─────────┐ ┌───────┐ ┌─────────┐
│Auth DB │ │User  │ │Product  │ │Order  │ │Payment  │
│:5432   │ │DB    │ │DB       │ │DB     │ │DB       │
└────────┘ │:5433 │ │:5434    │ │:5435  │ │:5436    │
           └──────┘ └─────────┘ └───────┘ └─────────┘
    │                    │
    └────────┬───────────┘
             ▼
        ┌────────┐
        │ Redis  │ (Port 6379)
        │ Cache  │
        └────────┘
```

### Services

| Service | Port | Protocol | Description |
|---------|------|----------|-------------|
| **API Gateway** | 3000 | HTTP/REST | External API entry point, translates REST to gRPC |
| **Auth Service** | 50051 | gRPC | User authentication, JWT token management, sessions |
| **User Service** | 50052 | gRPC | User profile management and operations |
| **Product Service** | 50053 | gRPC | Product catalog, inventory, caching |
| **Order Service** | 50054 | gRPC | Order creation, management, status tracking |
| **Payment Service** | 50055 | gRPC | Payment processing and refunds |

### Databases

Each service has its own PostgreSQL database instance:

| Database | Port | Service |
|----------|------|---------|
| auth_db | 5432 | Auth Service |
| user_db | 5433 | User Service |
| product_db | 5434 | Product Service |
| order_db | 5435 | Order Service |
| payment_db | 5436 | Payment Service |

**Redis** (Port 6379) is shared for caching and session management.

## Features

### Authentication & Authorization
- User registration and login
- JWT-based authentication
- Refresh token mechanism
- Session management with Redis
- Secure password hashing (bcrypt)

### User Management
- User profile CRUD operations
- Profile updates
- User listing with pagination

### Product Catalog
- Product CRUD operations
- Product search and filtering
- Category-based organization
- Redis caching for performance
- Stock management

### Order Management
- Order creation with product validation
- Order history and tracking
- Order status management
- Multi-item orders with automatic total calculation

### Payment Processing
- Payment processing for orders
- Payment status tracking
- Refund handling
- Transaction management

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher) - [Download](https://nodejs.org/)
- **npm** (v9 or higher) - Comes with Node.js
- **Docker** (v20.10 or higher) - [Download](https://www.docker.com/get-started)
- **Docker Compose** (v2.0 or higher) - Usually included with Docker Desktop
- **Git** - [Download](https://git-scm.com/)

### System Requirements

- **RAM**: Minimum 4GB available
- **Disk Space**: Minimum 10GB available
- **OS**: Linux, macOS, or Windows with WSL2

## Quick Start

Get the application running in under 5 minutes:

```bash
# 1. Clone the repository
git clone <repository-url>
cd grpc-ecommerce-microservices

# 2. Start all services with Docker Compose
docker-compose up --build

# 3. Wait for all services to be healthy (about 30-60 seconds)

# 4. Test the API
curl http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","name":"Test User"}'
```

The API Gateway will be available at `http://localhost:3000`.

## Installation

### Option 1: Docker (Recommended)

This is the easiest way to run the entire application:

```bash
# Start all services in detached mode
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down

# Stop and remove all data (clean slate)
docker-compose down -v
```

See [DOCKER.md](DOCKER.md) for detailed Docker documentation.

### Option 2: Local Development

For local development without Docker:

#### 1. Install Dependencies

```bash
# Install root dependencies
npm install

# Install dependencies for all services
npm run install:all
```

#### 2. Set Up Databases

Install and start PostgreSQL and Redis locally, then create databases:

```bash
# Create databases
createdb auth_db
createdb user_db
createdb product_db
createdb order_db
createdb payment_db
```

Run initialization scripts from `init-scripts/` directory for each database.

#### 3. Configure Environment Variables

Create `.env` files in each service directory based on `.env.example`:

```bash
# Example for services/auth/.env
GRPC_PORT=50051
DATABASE_URL=postgresql://localhost:5432/auth_db
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRES_IN=3600
```

#### 4. Generate Protocol Buffer Code

```bash
npm run proto:generate
```

#### 5. Start Services

Start each service in a separate terminal:

```bash
# Terminal 1 - Auth Service
cd services/auth
npm run start:dev

# Terminal 2 - User Service
cd services/user
npm run start:dev

# Terminal 3 - Product Service
cd services/product
npm run start:dev

# Terminal 4 - Order Service
cd services/order
npm run start:dev

# Terminal 5 - Payment Service
cd services/payment
npm run start:dev

# Terminal 6 - API Gateway
cd services/api-gateway
npm run start:dev
```

## Running the Application

### Using Docker Compose (Recommended)

```bash
# Start all services
docker-compose up

# Start in background
docker-compose up -d

# View logs
docker-compose logs -f

# View logs for specific service
docker-compose logs -f api-gateway

# Stop all services
docker-compose down

# Rebuild and start
docker-compose up --build

# Check service status
docker-compose ps
```

### Individual Services

```bash
# Start a specific service
cd services/auth
npm run start:dev

# Build a service
npm run build

# Run in production mode
npm run start:prod
```

## API Documentation

The API Gateway exposes a REST API on port 3000. Full API documentation is available in [API.md](API.md).

### Quick API Examples

#### Register a User

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePassword123!",
    "name": "John Doe"
  }'
```

#### Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePassword123!"
  }'
```

#### Create a Product (requires authentication)

```bash
curl -X POST http://localhost:3000/api/products \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Laptop",
    "description": "High-performance laptop",
    "price": 999.99,
    "stock": 50,
    "category": "Electronics"
  }'
```

#### Create an Order

```bash
curl -X POST http://localhost:3000/api/orders \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {
        "productId": "PRODUCT_UUID",
        "quantity": 2
      }
    ],
    "shippingAddress": "123 Main St, City, State 12345"
  }'
```

### API Endpoints Summary

| Category | Endpoint | Method | Auth Required |
|----------|----------|--------|---------------|
| **Auth** | `/api/auth/register` | POST | No |
| | `/api/auth/login` | POST | No |
| | `/api/auth/refresh` | POST | No |
| | `/api/auth/profile` | GET | Yes |
| **Users** | `/api/users/:id` | GET | Yes |
| | `/api/users/:id` | PUT | Yes |
| | `/api/users` | GET | Yes |
| **Products** | `/api/products` | GET | No |
| | `/api/products/:id` | GET | No |
| | `/api/products` | POST | Yes |
| | `/api/products/:id` | PUT | Yes |
| | `/api/products/:id` | DELETE | Yes |
| **Orders** | `/api/orders` | POST | Yes |
| | `/api/orders/:id` | GET | Yes |
| | `/api/orders/user/:userId` | GET | Yes |
| | `/api/orders/:id/status` | PUT | Yes |
| **Payments** | `/api/payments/process` | POST | Yes |
| | `/api/payments/:orderId` | GET | Yes |
| | `/api/payments/refund` | POST | Yes |

See [API.md](API.md) for complete documentation with request/response examples.

## Project Structure

```
grpc-ecommerce-microservices/
├── .kiro/                          # Kiro specs and documentation
│   └── specs/
│       └── grpc-ecommerce-microservices/
│           ├── requirements.md     # Project requirements
│           ├── design.md          # Architecture design
│           └── tasks.md           # Implementation tasks
├── proto/                         # Protocol Buffer definitions
│   ├── auth.proto                # Auth service contract
│   ├── user.proto                # User service contract
│   ├── product.proto             # Product service contract
│   ├── order.proto               # Order service contract
│   └── payment.proto             # Payment service contract
├── services/                      # Microservices
│   ├── api-gateway/              # REST API Gateway
│   │   ├── src/
│   │   │   ├── auth/            # Auth endpoints
│   │   │   ├── user/            # User endpoints
│   │   │   ├── product/         # Product endpoints
│   │   │   ├── order/           # Order endpoints
│   │   │   ├── payment/         # Payment endpoints
│   │   │   ├── guards/          # Auth guards
│   │   │   ├── filters/         # Exception filters
│   │   │   └── proto/           # Generated gRPC types
│   │   ├── Dockerfile
│   │   └── package.json
│   ├── auth/                     # Auth Service
│   │   ├── src/
│   │   │   ├── auth/            # Auth logic
│   │   │   ├── entities/        # Database entities
│   │   │   ├── database/        # Database config
│   │   │   ├── redis/           # Redis integration
│   │   │   └── proto/           # Generated gRPC types
│   │   ├── Dockerfile
│   │   └── package.json
│   ├── user/                     # User Service
│   ├── product/                  # Product Service
│   ├── order/                    # Order Service
│   └── payment/                  # Payment Service
├── init-scripts/                 # Database initialization
│   ├── auth/
│   │   └── 01-init.sql
│   ├── user/
│   ├── product/
│   ├── order/
│   └── payment/
├── docker-compose.yml            # Docker orchestration
├── package.json                  # Root package file
├── README.md                     # This file
├── API.md                        # API documentation
└── DOCKER.md                     # Docker documentation
```

## Technology Stack

### Backend Framework
- **NestJS** - Progressive Node.js framework for building efficient and scalable server-side applications
- **TypeScript** - Typed superset of JavaScript

### Communication
- **gRPC** - High-performance RPC framework for inter-service communication
- **Protocol Buffers** - Language-neutral, platform-neutral serialization mechanism
- **Express** - Web framework for REST API (via NestJS)

### Databases
- **PostgreSQL 15** - Primary relational database (one instance per service)
- **TypeORM** - ORM for database operations

### Caching & Sessions
- **Redis 7** - In-memory data store for caching and session management

### Authentication
- **JWT (jsonwebtoken)** - Token-based authentication
- **bcrypt** - Password hashing

### Containerization
- **Docker** - Container platform
- **Docker Compose** - Multi-container orchestration

### Development Tools
- **ts-proto** - Protocol Buffer compiler for TypeScript
- **ESLint** - Code linting
- **Prettier** - Code formatting

## Development

### Project Scripts

```bash
# Install all dependencies
npm run install:all

# Generate Protocol Buffer code
npm run proto:generate
```

### Service-Level Scripts

Each service has the following npm scripts:

```bash
# Development mode with hot reload
npm run start:dev

# Build for production
npm run build

# Run production build
npm run start:prod

# Run tests
npm run test

# Run tests with coverage
npm run test:cov

# Lint code
npm run lint

# Format code
npm run format
```

### Adding a New Service

1. Create service directory in `services/`
2. Define Protocol Buffer contract in `proto/`
3. Generate TypeScript code: `npm run proto:generate`
4. Implement gRPC service
5. Add database configuration
6. Create Dockerfile
7. Add service to `docker-compose.yml`
8. Create database initialization script

### Code Style

This project uses ESLint and Prettier for code consistency:

```bash
# Check linting
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format
```

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:cov

# Run tests in watch mode
npm run test:watch

# Run e2e tests
npm run test:e2e
```

### Test Structure

- **Unit Tests**: Test individual components and services
- **Integration Tests**: Test service-to-service communication
- **E2E Tests**: Test complete user flows through API Gateway

## Troubleshooting

### Common Issues

#### Port Already in Use

```bash
# Check what's using port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>
```

#### Docker Services Won't Start

```bash
# Check service logs
docker-compose logs <service-name>

# Restart specific service
docker-compose restart <service-name>

# Clean restart
docker-compose down -v
docker-compose up --build
```

#### Database Connection Errors

```bash
# Check if databases are running
docker-compose ps

# Check database logs
docker-compose logs postgres-auth

# Reset databases
docker-compose down -v
docker-compose up
```

#### gRPC Connection Errors

- Ensure all services are running
- Check service logs for errors
- Verify service URLs in environment variables
- Check network connectivity between containers

#### Redis Connection Errors

```bash
# Check Redis status
docker-compose logs redis

# Test Redis connection
docker-compose exec redis redis-cli ping
```

### Getting Help

1. Check the logs: `docker-compose logs -f`
2. Review [API.md](API.md) for API documentation
3. Review [DOCKER.md](DOCKER.md) for Docker-specific issues
4. Check the [requirements.md](.kiro/specs/grpc-ecommerce-microservices/requirements.md) and [design.md](.kiro/specs/grpc-ecommerce-microservices/design.md) for architecture details

## Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -am 'Add new feature'`
4. Push to the branch: `git push origin feature/my-feature`
5. Submit a pull request

### Development Workflow

1. Ensure all tests pass
2. Follow the existing code style
3. Update documentation as needed
4. Add tests for new features
5. Keep commits atomic and well-described

---

**Built with ❤️ using NestJS, gRPC, and Docker**
