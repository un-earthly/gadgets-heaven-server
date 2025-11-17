export default () => ({
    port: parseInt(process.env.GRPC_PORT, 10) || 50052,
    database: {
        url: process.env.DATABASE_URL || 'postgresql://user_user:user_pass@localhost:5433/user_db',
    },
});
