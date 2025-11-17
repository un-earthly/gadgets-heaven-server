export default () => ({
    database: {
        host: process.env.DATABASE_HOST || 'localhost',
        port: parseInt(process.env.DATABASE_PORT, 10) || 5435,
        username: process.env.DATABASE_USER || 'order_user',
        password: process.env.DATABASE_PASSWORD || 'order_pass',
        database: process.env.DATABASE_NAME || 'order_db',
    },
    grpc: {
        port: parseInt(process.env.GRPC_PORT, 10) || 50054,
        productServiceUrl: process.env.PRODUCT_SERVICE_URL || 'localhost:50053',
    },
});
