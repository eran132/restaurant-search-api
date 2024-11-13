import { Pool } from 'pg';
import dotenv from 'dotenv';
import { defaultConfig, testConfig } from '../src/db/connection';

dotenv.config();

async function createDatabase(isTest = false) {
    const config = isTest ? testConfig : defaultConfig;
    const pool = new Pool({
        ...config,
        database: 'postgres' // Connect to default postgres database first
    });

    try {
        const dbName = isTest ? 'restaurants_test' : 'restaurants';
        
        // Check if database exists
        const result = await pool.query(
            "SELECT datname FROM pg_database WHERE datname = $1",
            [dbName]
        );

        if (result.rows.length === 0) {
            await pool.query(`CREATE DATABASE ${dbName}`);
            console.log(`Created database: ${dbName}`);
        } else {
            console.log(`Database ${dbName} already exists, continuing with initialization`);
        }
    } catch (error) {
        console.error('Error during database check/creation:', error);
        throw error;
    } finally {
        await pool.end();
    }
}

async function initializeDatabase(isTest = false) {
    try {
        await createDatabase(isTest);

        const config = isTest ? testConfig : defaultConfig;
        const pool = new Pool(config);

        // Create tables
        await pool.query(`
            CREATE TABLE IF NOT EXISTS restaurants (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                address TEXT NOT NULL,
                phone VARCHAR(20),
                website VARCHAR(255),
                opening_hours JSONB,
                cuisine_type VARCHAR(100),
                is_kosher BOOLEAN,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS audit_logs (
                id SERIAL PRIMARY KEY,
                endpoint VARCHAR(255),
                method VARCHAR(10),
                query_params JSONB,
                ip_address VARCHAR(45),
                country VARCHAR(100),
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('Created tables');

        // Insert sample data only in development environment
        if (!isTest) {
            await pool.query(`
                INSERT INTO restaurants (
                    name, address, phone, website, 
                    opening_hours, cuisine_type, is_kosher
                ) VALUES 
                (
                    'Falafel King', 
                    'Tel Aviv, Dizengoff 123', 
                    '03-1234567', 
                    'www.falafelking.co.il',
                    '{"monday": {"open": "09:00", "close": "22:00"}, 
                      "tuesday": {"open": "09:00", "close": "22:00"},
                      "wednesday": {"open": "09:00", "close": "22:00"},
                      "thursday": {"open": "09:00", "close": "22:00"},
                      "friday": {"open": "15:00", "close": "22:00"},
                      "saturday": {"open": "18:00", "close": "23:00"},
                      "sunday": {"open": "09:00", "close": "22:00"}}',
                    'Middle Eastern',
                    true
                ),
                (
                    'Pizza Palace', 
                    'Jerusalem, Jaffa 45', 
                    '02-7654321', 
                    'www.pizzapalace.co.il',
                    '{"monday": {"open": "11:00", "close": "23:00"},
                      "tuesday": {"open": "11:00", "close": "23:00"},
                      "wednesday": {"open": "11:00", "close": "23:00"},
                      "thursday": {"open": "11:00", "close": "23:00"},
                      "friday": {"open": "11:00", "close": "14:00"},
                      "saturday": {"open": "19:00", "close": "23:00"},
                      "sunday": {"open": "11:00", "close": "23:00"}}',
                    'Italian',
                    false
                )
                ON CONFLICT DO NOTHING;
            `);
            console.log('Inserted sample data');
        }

        await pool.end();
        console.log(`Database initialization complete for ${isTest ? 'test' : 'development'} environment`);
    } catch (error) {
        console.error('Error during database initialization:', error);
        process.exit(1);
    }
}

// Initialize based on NODE_ENV
const isTestEnv = process.env.NODE_ENV === 'test';
initializeDatabase(isTestEnv);