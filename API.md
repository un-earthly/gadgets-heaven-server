# E-Commerce Microservices API Documentation

## Overview

This document provides comprehensive documentation for the E-Commerce Microservices REST API. The API Gateway serves as the single entry point for all client requests, translating REST/HTTP requests into gRPC calls to backend microservices.

**Base URL**: `http://localhost:3000`

**API Version**: 1.0

## Table of Contents

1. [Authentication](#authentication)
2. [Authentication Endpoints](#authentication-endpoints)
3. [User Management Endpoints](#user-management-endpoints)
4. [Product Management Endpoints](#product-management-endpoints)
5. [Order Management Endpoints](#order-management-endpoints)
6. [Payment Management Endpoints](#payment-management-endpoints)
7. [Error Responses](#error-responses)
8. [Status Codes](#status-codes)

## Authentication

Most endpoints require authentication using JWT (JSON Web Token). After successful login or registration, you'll receive an access token that must be included in subsequent requests.

### Authentication Header

```
Authorization: Bearer <access_token>
```

### Token Expiration

- **Access Token**: Expires in 1 hour
- **Refresh Token**: Expires in 7 days

Use the refresh token endpoint to obtain a new access token without re-authenticating.

---

## Authentication Endpoints

### 1. Register New User

Create a new user account.

**Endpoint**: `POST /api/auth/register`

**Authentication**: Not required

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "name": "John Doe"
}
```

**Response** (201 Created):
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 3600,
  "userId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Error Responses**:
- `400 Bad Request`: Invalid input data or missing required fields
- `409 Conflict`: Email already exists

**Example**:
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePassword123!",
    "name": "John Doe"
  }'
```

---

### 2. Login

Authenticate with existing credentials.

**Endpoint**: `POST /api/auth/login`

**Authentication**: Not required

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Response** (200 OK):
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 3600,
  "userId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Error Responses**:
- `400 Bad Request`: Invalid input data
- `401 Unauthorized`: Invalid credentials

**Example**:
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePassword123!"
  }'
```

---

### 3. Refresh Token

Obtain a new access token using a refresh token.

**Endpoint**: `POST /api/auth/refresh`

**Authentication**: Not required (uses refresh token)

**Request Body**:
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response** (200 OK):
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 3600,
  "userId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Error Responses**:
- `401 Unauthorized`: Invalid or expired refresh token

**Example**:
```bash
curl -X POST http://localhost:3000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }'
```

---

### 4. Get User Profile

Retrieve the authenticated user's profile information.

**Endpoint**: `GET /api/auth/profile`

**Authentication**: Required

**Response** (200 OK):
```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "name": "John Doe",
  "createdAt": "2025-11-17T10:30:00Z"
}
```

**Error Responses**:
- `401 Unauthorized`: Missing or invalid token

**Example**:
```bash
curl -X GET http://localhost:3000/api/auth/profile \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## User Management Endpoints

### 5. Get User by ID

Retrieve a specific user's profile information.

**Endpoint**: `GET /api/users/:id`

**Authentication**: Required

**Path Parameters**:
- `id` (string, UUID): User ID

**Response** (200 OK):
```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "name": "John Doe",
  "email": "user@example.com",
  "phone": "+1234567890",
  "address": "123 Main St, City, State 12345",
  "createdAt": "2025-11-17T10:30:00Z",
  "updatedAt": "2025-11-17T10:30:00Z"
}
```

**Error Responses**:
- `401 Unauthorized`: Missing or invalid token
- `404 Not Found`: User not found

**Example**:
```bash
curl -X GET http://localhost:3000/api/users/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

### 6. Update User Profile

Update the authenticated user's profile information.

**Endpoint**: `PUT /api/users/:id`

**Authentication**: Required

**Path Parameters**:
- `id` (string, UUID): User ID

**Request Body**:
```json
{
  "name": "John Smith",
  "email": "john.smith@example.com",
  "phone": "+1234567890",
  "address": "456 Oak Ave, City, State 12345"
}
```

**Response** (200 OK):
```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "name": "John Smith",
  "email": "john.smith@example.com",
  "phone": "+1234567890",
  "address": "456 Oak Ave, City, State 12345",
  "createdAt": "2025-11-17T10:30:00Z",
  "updatedAt": "2025-11-17T12:45:00Z"
}
```

**Error Responses**:
- `400 Bad Request`: Invalid input data
- `401 Unauthorized`: Missing or invalid token
- `403 Forbidden`: Cannot update another user's profile
- `404 Not Found`: User not found

**Example**:
```bash
curl -X PUT http://localhost:3000/api/users/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Smith",
    "phone": "+1234567890",
    "address": "456 Oak Ave, City, State 12345"
  }'
```

---

### 7. List Users

Retrieve a paginated list of all users.

**Endpoint**: `GET /api/users`

**Authentication**: Required

**Query Parameters**:
- `page` (integer, optional): Page number (default: 1)
- `limit` (integer, optional): Items per page (default: 10, max: 100)

**Response** (200 OK):
```json
{
  "users": [
    {
      "userId": "550e8400-e29b-41d4-a716-446655440000",
      "name": "John Doe",
      "email": "user@example.com",
      "phone": "+1234567890",
      "address": "123 Main St, City, State 12345",
      "createdAt": "2025-11-17T10:30:00Z",
      "updatedAt": "2025-11-17T10:30:00Z"
    }
  ],
  "total": 1
}
```

**Error Responses**:
- `401 Unauthorized`: Missing or invalid token

**Example**:
```bash
curl -X GET "http://localhost:3000/api/users?page=1&limit=10" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## Product Management Endpoints

### 8. List Products

Retrieve a paginated list of products.

**Endpoint**: `GET /api/products`

**Authentication**: Not required

**Query Parameters**:
- `page` (integer, optional): Page number (default: 1)
- `limit` (integer, optional): Items per page (default: 10, max: 100)
- `category` (string, optional): Filter by category

**Response** (200 OK):
```json
{
  "products": [
    {
      "productId": "660e8400-e29b-41d4-a716-446655440000",
      "name": "Laptop",
      "description": "High-performance laptop with 16GB RAM",
      "price": 999.99,
      "stock": 50,
      "category": "Electronics",
      "createdAt": "2025-11-17T10:30:00Z",
      "updatedAt": "2025-11-17T10:30:00Z"
    }
  ],
  "total": 1
}
```

**Example**:
```bash
curl -X GET "http://localhost:3000/api/products?page=1&limit=10&category=Electronics"
```

---

### 9. Get Product by ID

Retrieve a specific product's details.

**Endpoint**: `GET /api/products/:id`

**Authentication**: Not required

**Path Parameters**:
- `id` (string, UUID): Product ID

**Response** (200 OK):
```json
{
  "productId": "660e8400-e29b-41d4-a716-446655440000",
  "name": "Laptop",
  "description": "High-performance laptop with 16GB RAM",
  "price": 999.99,
  "stock": 50,
  "category": "Electronics",
  "createdAt": "2025-11-17T10:30:00Z",
  "updatedAt": "2025-11-17T10:30:00Z"
}
```

**Error Responses**:
- `404 Not Found`: Product not found

**Example**:
```bash
curl -X GET http://localhost:3000/api/products/660e8400-e29b-41d4-a716-446655440000
```

---

### 10. Create Product

Create a new product (admin only).

**Endpoint**: `POST /api/products`

**Authentication**: Required

**Request Body**:
```json
{
  "name": "Laptop",
  "description": "High-performance laptop with 16GB RAM",
  "price": 999.99,
  "stock": 50,
  "category": "Electronics"
}
```

**Response** (201 Created):
```json
{
  "productId": "660e8400-e29b-41d4-a716-446655440000",
  "name": "Laptop",
  "description": "High-performance laptop with 16GB RAM",
  "price": 999.99,
  "stock": 50,
  "category": "Electronics",
  "createdAt": "2025-11-17T10:30:00Z",
  "updatedAt": "2025-11-17T10:30:00Z"
}
```

**Error Responses**:
- `400 Bad Request`: Invalid input data
- `401 Unauthorized`: Missing or invalid token

**Example**:
```bash
curl -X POST http://localhost:3000/api/products \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Laptop",
    "description": "High-performance laptop with 16GB RAM",
    "price": 999.99,
    "stock": 50,
    "category": "Electronics"
  }'
```

---

### 11. Update Product

Update an existing product (admin only).

**Endpoint**: `PUT /api/products/:id`

**Authentication**: Required

**Path Parameters**:
- `id` (string, UUID): Product ID

**Request Body**:
```json
{
  "name": "Gaming Laptop",
  "description": "High-performance gaming laptop with 32GB RAM",
  "price": 1299.99,
  "stock": 30,
  "category": "Electronics"
}
```

**Response** (200 OK):
```json
{
  "productId": "660e8400-e29b-41d4-a716-446655440000",
  "name": "Gaming Laptop",
  "description": "High-performance gaming laptop with 32GB RAM",
  "price": 1299.99,
  "stock": 30,
  "category": "Electronics",
  "createdAt": "2025-11-17T10:30:00Z",
  "updatedAt": "2025-11-17T14:20:00Z"
}
```

**Error Responses**:
- `400 Bad Request`: Invalid input data
- `401 Unauthorized`: Missing or invalid token
- `404 Not Found`: Product not found

**Example**:
```bash
curl -X PUT http://localhost:3000/api/products/660e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Gaming Laptop",
    "price": 1299.99,
    "stock": 30
  }'
```

---

### 12. Delete Product

Delete a product (admin only).

**Endpoint**: `DELETE /api/products/:id`

**Authentication**: Required

**Path Parameters**:
- `id` (string, UUID): Product ID

**Response** (200 OK):
```json
{
  "success": true
}
```

**Error Responses**:
- `401 Unauthorized`: Missing or invalid token
- `404 Not Found`: Product not found

**Example**:
```bash
curl -X DELETE http://localhost:3000/api/products/660e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## Order Management Endpoints

### 13. Create Order

Create a new order for the authenticated user.

**Endpoint**: `POST /api/orders`

**Authentication**: Required

**Request Body**:
```json
{
  "items": [
    {
      "productId": "660e8400-e29b-41d4-a716-446655440000",
      "quantity": 2
    },
    {
      "productId": "770e8400-e29b-41d4-a716-446655440001",
      "quantity": 1
    }
  ],
  "shippingAddress": "123 Main St, City, State 12345"
}
```

**Response** (201 Created):
```json
{
  "orderId": "880e8400-e29b-41d4-a716-446655440000",
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "items": [
    {
      "productId": "660e8400-e29b-41d4-a716-446655440000",
      "productName": "Laptop",
      "quantity": 2,
      "price": 999.99,
      "subtotal": 1999.98
    },
    {
      "productId": "770e8400-e29b-41d4-a716-446655440001",
      "productName": "Mouse",
      "quantity": 1,
      "price": 29.99,
      "subtotal": 29.99
    }
  ],
  "totalAmount": 2029.97,
  "status": "pending",
  "shippingAddress": "123 Main St, City, State 12345",
  "createdAt": "2025-11-17T10:30:00Z",
  "updatedAt": "2025-11-17T10:30:00Z"
}
```

**Error Responses**:
- `400 Bad Request`: Invalid input data or product not available
- `401 Unauthorized`: Missing or invalid token

**Example**:
```bash
curl -X POST http://localhost:3000/api/orders \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {
        "productId": "660e8400-e29b-41d4-a716-446655440000",
        "quantity": 2
      }
    ],
    "shippingAddress": "123 Main St, City, State 12345"
  }'
```

---

### 14. Get Order by ID

Retrieve a specific order's details.

**Endpoint**: `GET /api/orders/:id`

**Authentication**: Required

**Path Parameters**:
- `id` (string, UUID): Order ID

**Response** (200 OK):
```json
{
  "orderId": "880e8400-e29b-41d4-a716-446655440000",
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "items": [
    {
      "productId": "660e8400-e29b-41d4-a716-446655440000",
      "productName": "Laptop",
      "quantity": 2,
      "price": 999.99,
      "subtotal": 1999.98
    }
  ],
  "totalAmount": 1999.98,
  "status": "pending",
  "shippingAddress": "123 Main St, City, State 12345",
  "createdAt": "2025-11-17T10:30:00Z",
  "updatedAt": "2025-11-17T10:30:00Z"
}
```

**Error Responses**:
- `401 Unauthorized`: Missing or invalid token
- `403 Forbidden`: Cannot access another user's order
- `404 Not Found`: Order not found

**Example**:
```bash
curl -X GET http://localhost:3000/api/orders/880e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

### 15. List User Orders

Retrieve all orders for a specific user.

**Endpoint**: `GET /api/orders/user/:userId`

**Authentication**: Required

**Path Parameters**:
- `userId` (string, UUID): User ID

**Query Parameters**:
- `page` (integer, optional): Page number (default: 1)
- `limit` (integer, optional): Items per page (default: 10, max: 100)

**Response** (200 OK):
```json
{
  "orders": [
    {
      "orderId": "880e8400-e29b-41d4-a716-446655440000",
      "userId": "550e8400-e29b-41d4-a716-446655440000",
      "items": [
        {
          "productId": "660e8400-e29b-41d4-a716-446655440000",
          "productName": "Laptop",
          "quantity": 2,
          "price": 999.99,
          "subtotal": 1999.98
        }
      ],
      "totalAmount": 1999.98,
      "status": "pending",
      "shippingAddress": "123 Main St, City, State 12345",
      "createdAt": "2025-11-17T10:30:00Z",
      "updatedAt": "2025-11-17T10:30:00Z"
    }
  ],
  "total": 1
}
```

**Error Responses**:
- `401 Unauthorized`: Missing or invalid token
- `403 Forbidden`: Cannot access another user's orders

**Example**:
```bash
curl -X GET "http://localhost:3000/api/orders/user/550e8400-e29b-41d4-a716-446655440000?page=1&limit=10" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

### 16. Update Order Status

Update the status of an order (admin only).

**Endpoint**: `PUT /api/orders/:id/status`

**Authentication**: Required

**Path Parameters**:
- `id` (string, UUID): Order ID

**Request Body**:
```json
{
  "status": "confirmed"
}
```

**Valid Status Values**:
- `pending`
- `confirmed`
- `processing`
- `shipped`
- `delivered`
- `cancelled`

**Response** (200 OK):
```json
{
  "orderId": "880e8400-e29b-41d4-a716-446655440000",
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "items": [
    {
      "productId": "660e8400-e29b-41d4-a716-446655440000",
      "productName": "Laptop",
      "quantity": 2,
      "price": 999.99,
      "subtotal": 1999.98
    }
  ],
  "totalAmount": 1999.98,
  "status": "confirmed",
  "shippingAddress": "123 Main St, City, State 12345",
  "createdAt": "2025-11-17T10:30:00Z",
  "updatedAt": "2025-11-17T11:00:00Z"
}
```

**Error Responses**:
- `400 Bad Request`: Invalid status value
- `401 Unauthorized`: Missing or invalid token
- `404 Not Found`: Order not found

**Example**:
```bash
curl -X PUT http://localhost:3000/api/orders/880e8400-e29b-41d4-a716-446655440000/status \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "status": "confirmed"
  }'
```

---

## Payment Management Endpoints

### 17. Process Payment

Process a payment for an order.

**Endpoint**: `POST /api/payments/process`

**Authentication**: Required

**Request Body**:
```json
{
  "orderId": "880e8400-e29b-41d4-a716-446655440000",
  "paymentMethod": "credit_card",
  "paymentDetails": {
    "cardNumber": "4111111111111111",
    "cardHolder": "John Doe",
    "expiryDate": "12/25",
    "cvv": "123"
  }
}
```

**Response** (201 Created):
```json
{
  "paymentId": "990e8400-e29b-41d4-a716-446655440000",
  "orderId": "880e8400-e29b-41d4-a716-446655440000",
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "amount": 1999.98,
  "status": "completed",
  "paymentMethod": "credit_card",
  "transactionId": "txn_1234567890",
  "createdAt": "2025-11-17T10:35:00Z",
  "updatedAt": "2025-11-17T10:35:00Z"
}
```

**Error Responses**:
- `400 Bad Request`: Invalid payment details or order not found
- `401 Unauthorized`: Missing or invalid token
- `402 Payment Required`: Payment processing failed

**Example**:
```bash
curl -X POST http://localhost:3000/api/payments/process \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "880e8400-e29b-41d4-a716-446655440000",
    "paymentMethod": "credit_card",
    "paymentDetails": {
      "cardNumber": "4111111111111111",
      "cardHolder": "John Doe",
      "expiryDate": "12/25",
      "cvv": "123"
    }
  }'
```

---

### 18. Get Payment by Order ID

Retrieve payment information for a specific order.

**Endpoint**: `GET /api/payments/:orderId`

**Authentication**: Required

**Path Parameters**:
- `orderId` (string, UUID): Order ID

**Response** (200 OK):
```json
{
  "paymentId": "990e8400-e29b-41d4-a716-446655440000",
  "orderId": "880e8400-e29b-41d4-a716-446655440000",
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "amount": 1999.98,
  "status": "completed",
  "paymentMethod": "credit_card",
  "transactionId": "txn_1234567890",
  "createdAt": "2025-11-17T10:35:00Z",
  "updatedAt": "2025-11-17T10:35:00Z"
}
```

**Error Responses**:
- `401 Unauthorized`: Missing or invalid token
- `403 Forbidden`: Cannot access another user's payment information
- `404 Not Found`: Payment not found

**Example**:
```bash
curl -X GET http://localhost:3000/api/payments/880e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

### 19. Request Refund

Request a refund for a completed payment.

**Endpoint**: `POST /api/payments/refund`

**Authentication**: Required

**Request Body**:
```json
{
  "paymentId": "990e8400-e29b-41d4-a716-446655440000",
  "reason": "Product defective"
}
```

**Response** (200 OK):
```json
{
  "paymentId": "990e8400-e29b-41d4-a716-446655440000",
  "orderId": "880e8400-e29b-41d4-a716-446655440000",
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "amount": 1999.98,
  "status": "refunded",
  "paymentMethod": "credit_card",
  "transactionId": "txn_1234567890",
  "createdAt": "2025-11-17T10:35:00Z",
  "updatedAt": "2025-11-17T12:00:00Z"
}
```

**Error Responses**:
- `400 Bad Request`: Payment not eligible for refund
- `401 Unauthorized`: Missing or invalid token
- `404 Not Found`: Payment not found

**Example**:
```bash
curl -X POST http://localhost:3000/api/payments/refund \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "paymentId": "990e8400-e29b-41d4-a716-446655440000",
    "reason": "Product defective"
  }'
```

---

## Error Responses

All error responses follow a consistent format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {
      "field": "Additional context"
    },
    "timestamp": "2025-11-17T10:30:00Z"
  }
}
```

### Common Error Codes

| Code | Description |
|------|-------------|
| `INVALID_INPUT` | Request validation failed |
| `UNAUTHORIZED` | Authentication required or failed |
| `FORBIDDEN` | Insufficient permissions |
| `RESOURCE_NOT_FOUND` | Requested resource doesn't exist |
| `DUPLICATE_RESOURCE` | Resource already exists |
| `PAYMENT_FAILED` | Payment processing failed |
| `SERVICE_UNAVAILABLE` | Backend service temporarily unavailable |
| `INTERNAL_ERROR` | Unexpected server error |

---

## Status Codes

| Status Code | Description |
|-------------|-------------|
| `200 OK` | Request successful |
| `201 Created` | Resource created successfully |
| `400 Bad Request` | Invalid request data |
| `401 Unauthorized` | Authentication required or failed |
| `403 Forbidden` | Insufficient permissions |
| `404 Not Found` | Resource not found |
| `409 Conflict` | Resource conflict (e.g., duplicate) |
| `500 Internal Server Error` | Server error |
| `503 Service Unavailable` | Service temporarily unavailable |

---

## Rate Limiting

Currently, no rate limiting is implemented. In production, consider implementing rate limiting at the API Gateway level.

---

## Postman Collection

A Postman collection with all endpoints and example requests is available for import. Contact the development team for access.

---

## Support

For API support or questions, please contact the development team or refer to the project README for additional documentation.
