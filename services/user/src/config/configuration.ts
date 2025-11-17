export default () => ({
    port: parseInt(process.env.GRPC_PORT, 10) || 50052,
    database: {
        host: process.env.DATABASE_HOST || 'localhost',
        port: parseInt(process.env.DATABASE_PORT, 10) || 5433,
        username: process.env.DATABASE_USER || 'user_user',
        password: process.env.DATABASE_PASSWORD || 'user_pass',
        database: process.env.DATABASE_NAME || 'user_db',
    },
});
