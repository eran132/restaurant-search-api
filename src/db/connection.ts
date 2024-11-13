import { Pool, PoolConfig } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

interface DatabaseConfig extends PoolConfig {
    user: string;
    host: string;
    database: string;
    password: string;
    port: number;
}

export const defaultConfig: DatabaseConfig = {
    user: process.env.DB_USER || 'user',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'restaurants',
    password: process.env.DB_PASSWORD || 'password',
    port: parseInt(process.env.DB_PORT || '5432'),
};

// Use same schema but different database for tests
export const testConfig: DatabaseConfig = {
    ...defaultConfig,
    database: 'restaurants_test',
    // Override with environment variables if provided
    user: process.env.PGUSER || defaultConfig.user,
    password: process.env.PGPASSWORD || defaultConfig.password,
};

const pool = new Pool(process.env.NODE_ENV === 'test' ? testConfig : defaultConfig);

pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
    process.exit(-1);
});

export { pool };
export default pool;