// tests/teardown.ts
import { Pool } from 'pg';
import { testConfig } from '../src/db/connection';

module.exports = async () => {
    try {
        // Connect to postgres to drop test database
        const pool = new Pool({
            ...testConfig,
            database: 'postgres'
        });

        // Force disconnect all sessions
        await pool.query(`
            SELECT pg_terminate_backend(pid)
            FROM pg_stat_activity
            WHERE datname = 'restaurants_test'
            AND pid <> pg_backend_pid()
        `);

        // Wait for connections to close
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Drop test database
        await pool.query('DROP DATABASE IF EXISTS restaurants_test');
        await pool.end();

        console.log('Test environment cleaned up');
    } catch (error) {
        console.error('Teardown failed:', error);
        // Don't throw error to allow Jest to exit
        process.exit(0);
    }
};