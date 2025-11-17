export default () => ({
    database: {
        host: process.env.DATABASE_HOST || 'localhost',
        port: parseInt(process.env.DATABASE_PORT, 10) || 5434,
        username: process.env.DATABASE_USER || 'product_user',
        password: process.env.DATABASE_PASSWORD || 'product_pass',
        database: process.env.DATABASE_NAME || 'product_db',
    },
    redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    },
    grpc: {
        port: parseInt(process.env.GRPC_PORT, 10) || 50053,
    },
});
