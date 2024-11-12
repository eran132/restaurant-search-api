import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
    user: process.env.DB_USER || 'user',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'restaurants',
    password: process.env.DB_PASSWORD || 'password',
    port: parseInt(process.env.DB_PORT || '5432'),
});

async function initializeDatabase() {
    try {
        // Create restaurants table with JSONB opening_hours
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
        `);

        console.log('Created restaurants table');

        // Create audit_logs table
        await pool.query(`
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

        console.log('Created audit_logs table');

        // Insert sample data with proper opening hours format
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
                  "friday": {"open": "09:00", "close": "15:00"},
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

        await pool.end();
        console.log('Database initialization complete');
    } catch (error) {
        console.error('Error during database initialization:', error);
        await pool.end();
        process.exit(1);
    }
}

initializeDatabase();