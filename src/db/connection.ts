import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const config = {
    user: process.env.DB_USER || 'user',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'restaurants',
    password: process.env.DB_PASSWORD || 'password',
    port: parseInt(process.env.DB_PORT || '5432'),
};

const pool = process.env.NODE_ENV === 'test' ? new Pool() : new Pool(config);

export { pool };  // Named export
export default pool;  // Default export