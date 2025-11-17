# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy proto files from project root
COPY proto /proto

# Copy package files
COPY services/api-gateway/package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY services/api-gateway .

# Build the application
RUN npm run build

# Production stage
FROM node:18-alpine

WORKDIR /app

# Copy built application and dependencies
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package*.json ./

# Copy proto files from project root
COPY --from=builder /proto /app/proto

# Expose HTTP port
EXPOSE 3000

# Start the application
CMD ["node", "dist/main.js"]
