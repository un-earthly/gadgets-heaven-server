# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy proto files from project root
COPY proto /proto

# Copy package files
COPY services/user/package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY services/user .

# Build the application
RUN npm run build

# Production stage
FROM node:18-alpine

WORKDIR /app

# Copy built application and dependencies
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package*.json ./

# Copy proto files
COPY --from=builder /proto /proto

# Expose gRPC port
EXPOSE 50052

# Start the application
CMD ["node", "dist/main.js"]
