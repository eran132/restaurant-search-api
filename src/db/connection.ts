import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const defaultConfig = {
    user: process.env.PGUSER || 'defaultUser',
    host: process.env.PGHOST || 'localhost',
    database: process.env.PGDATABASE || 'defaultDatabase',
    password: process.env.PGPASSWORD || 'defaultPassword',
    port: parseInt(process.env.PGPORT || '5432', 10),
};

const testConfig = {
    user: process.env.TEST_DB_USER || 'postgres',
    host: process.env.TEST_DB_HOST || 'restaurants_db',
    database: process.env.TEST_DB_NAME || 'restaurants_test',
    password: process.env.TEST_DB_PASSWORD || 'postgres',
    port: parseInt(process.env.TEST_DB_PORT || '5432', 10),
};

const pool = new Pool(process.env.NODE_ENV === 'test' ? testConfig : defaultConfig);

pool.on('error', (err: Error) => {
    console.error('Unexpected error on idle client', err);
});

export { pool, defaultConfig, testConfig };