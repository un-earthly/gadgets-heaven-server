# Docker Setup Guide

This guide explains how to run the gRPC E-commerce Microservices application using Docker and Docker Compose.

## Prerequisites

- Docker (version 20.10 or higher)
- Docker Compose (version 2.0 or higher)
- At least 4GB of available RAM
- At least 10GB of available disk space

## Quick Start

1. **Build and start all services:**
   ```bash
   docker-compose up --build
   ```

2. **Start services in detached mode:**
   ```bash
   docker-compose up -d
   ```

3. **View logs:**
   ```bash
   # All services
   docker-compose logs -f
   
   # Specific service
   docker-compose logs -f api-gateway
   ```

4. **Stop all services:**
   ```bash
   docker-compose down
   ```

5. **Stop and remove volumes (clean slate):**
   ```bash
   docker-compose down -v
   ```

## Services and Ports

| Service | Type | Port | Description |
|---------|------|------|-------------|
| API Gateway | HTTP/REST | 3000 | External API entry point |
| Auth Service | gRPC | 50051 | Authentication service |
| User Service | gRPC | 50052 | User management service |
| Product Service | gRPC | 50053 | Product catalog service |
| Order Service | gRPC | 50054 | Order management service |
| Payment Service | gRPC | 50055 | Payment processing service |
| Redis | Cache | 6379 | Cache and session store |
| PostgreSQL (Auth) | Database | 5432 | Auth database |
| PostgreSQL (User) | Database | 5433 | User database |
| PostgreSQL (Product) | Database | 5434 | Product database |
| PostgreSQL (Order) | Database | 5435 | Order database |
| PostgreSQL (Payment) | Database | 5436 | Payment database |

## Database Initialization

Database schemas are automatically initialized when containers start for the first time using SQL scripts in the `init-scripts/` directory:

- `init-scripts/auth/01-init.sql` - Auth service schema
- `init-scripts/user/01-init.sql` - User service schema
- `init-scripts/product/01-init.sql` - Product service schema
- `init-scripts/order/01-init.sql` - Order service schema
- `init-scripts/payment/01-init.sql` - Payment service schema

## Environment Variables

Each service uses environment variables for configuration. Default values are set in `docker-compose.yml`. For production, create a `.env` file or use Docker secrets.

### Important Variables to Change in Production:

- `JWT_SECRET` - Change from default value
- Database passwords for all PostgreSQL instances
- Redis password (if enabled)

## Health Checks

All services include health checks:

```bash
# Check service health
docker-compose ps

# Check specific service logs
docker-compose logs auth-service
```

## Troubleshooting

### Services fail to start

1. Check if ports are already in use:
   ```bash
   lsof -i :3000
   lsof -i :5432
   ```

2. Check service logs:
   ```bash
   docker-compose logs <service-name>
   ```

### Database connection issues

1. Ensure databases are healthy:
   ```bash
   docker-compose ps
   ```

2. Check database logs:
   ```bash
   docker-compose logs postgres-auth
   ```

### Reset everything

```bash
# Stop all services and remove volumes
docker-compose down -v

# Remove all images
docker-compose down --rmi all

# Rebuild and start
docker-compose up --build
```

## Development Workflow

### Rebuild a specific service

```bash
docker-compose up -d --build auth-service
```

### Access a service shell

```bash
docker-compose exec auth-service sh
```

### Access PostgreSQL

```bash
# Auth database
docker-compose exec postgres-auth psql -U auth_user -d auth_db

# User database
docker-compose exec postgres-user psql -U user_user -d user_db
```

### Access Redis CLI

```bash
docker-compose exec redis redis-cli
```

## Production Considerations

1. **Use environment-specific compose files:**
   ```bash
   docker-compose -f docker-compose.yml -f docker-compose.prod.yml up
   ```

2. **Enable TLS for gRPC communication**

3. **Use Docker secrets for sensitive data**

4. **Set up proper logging and monitoring**

5. **Configure resource limits:**
   ```yaml
   deploy:
     resources:
       limits:
         cpus: '0.5'
         memory: 512M
   ```

6. **Use health checks for orchestration**

7. **Implement proper backup strategies for databases**

## Testing the API

Once all services are running, test the API Gateway:

```bash
# Health check
curl http://localhost:3000/health

# Register a user
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","name":"Test User"}'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

## Monitoring

View real-time resource usage:

```bash
docker stats
```

## Cleanup

Remove all containers, networks, and volumes:

```bash
docker-compose down -v --remove-orphans
docker system prune -a
```
