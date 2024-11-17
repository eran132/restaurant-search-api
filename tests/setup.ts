// tests/setup.ts
import { Pool } from 'pg';
import { testConfig } from '../src/db/connection';

let pool: Pool;

// Export for use in tests
export const getPool = () => pool;

// Use module.exports for Jest globals
module.exports = async () => {
  pool = new Pool(testConfig);
  try {
    await pool.query('SELECT 1');
    console.log('Test database connection established');
  } catch (error) {
    console.error('Error connecting to test database:', error);
    throw error;
  }
};

// Clean up
module.exports.teardown = async () => {
  if (pool) {
    await pool.end();
  }
};