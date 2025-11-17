# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Install build dependencies for native modules
RUN apk add --no-cache python3 make g++

# Copy proto files from project root
COPY proto /proto

# Copy package files
COPY services/auth/package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY services/auth .

# Build the application
RUN npm run build

# Production stage
FROM node:18-alpine

WORKDIR /app

# Install runtime dependencies for native modules
RUN apk add --no-cache libc6-compat

# Copy built application and dependencies
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package*.json ./

# Copy proto files
COPY --from=builder /proto /proto

# Expose gRPC port
EXPOSE 50051

# Start the application
CMD ["node", "dist/main.js"]
