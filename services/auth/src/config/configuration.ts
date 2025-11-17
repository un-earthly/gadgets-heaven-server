export default () => ({
    port: parseInt(process.env.GRPC_PORT, 10) || 50051,
    database: {
        host: process.env.DATABASE_HOST || 'localhost',
        port: parseInt(process.env.DATABASE_PORT, 10) || 5432,
        username: process.env.DATABASE_USER || 'auth_user',
        password: process.env.DATABASE_PASSWORD || 'auth_pass',
        database: process.env.DATABASE_NAME || 'auth_db',
    },
    redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    },
    jwt: {
        secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
        expiresIn: process.env.JWT_EXPIRES_IN || '15m',
        refreshExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d',
    },
});
