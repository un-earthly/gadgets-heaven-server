export default () => ({
    database: {
        host: process.env.DATABASE_HOST || 'localhost',
        port: parseInt(process.env.DATABASE_PORT, 10) || 5436,
        username: process.env.DATABASE_USER || 'payment_user',
        password: process.env.DATABASE_PASSWORD || 'payment_pass',
        database: process.env.DATABASE_NAME || 'payment_db',
    },
    grpc: {
        port: parseInt(process.env.GRPC_PORT, 10) || 50055,
        orderServiceUrl: process.env.ORDER_SERVICE_URL || 'localhost:50054',
    },
});
