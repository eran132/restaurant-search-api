import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { defaultConfig, testConfig } from '../src/db/connection';

dotenv.config();

async function createDatabase(isTest = false) {
    const config = isTest ? testConfig : defaultConfig;
    const pool = new Pool({
        ...config,
        host: config.host, // Use the host from the config
        database: 'postgres'
    });

    try {
        const dbName = isTest ? 'restaurants_test' : 'restaurants';
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

async function loadSeedData() {
    const seedPath = path.join(__dirname, 'restaurants.json');
    console.log('Looking for seed file at:', seedPath);
    
    if (!fs.existsSync(seedPath)) {
        console.log('No seed file found at:', seedPath);
        return null;
    }

    try {
        const fileContent = fs.readFileSync(seedPath, 'utf-8');
        console.log('File content length:', fileContent.length);
        
        let data: { restaurants: any[] };
        try {
            const jsonData = JSON.parse(fileContent);
            data = jsonData.restaurants;
            
            if (!Array.isArray(data)) {
                console.error('restaurants property must be an array');
                console.log('Actual content type:', typeof data);
                return null;
            }
        } catch (error) {
            const parseError = error as Error;
            console.error('Failed to parse JSON:', parseError.message);
            console.log('Content preview:', fileContent.substring(0, 200));
            return null;
        }

        if (data.length > 0) {
            console.log(`Loaded ${data.length} restaurants from seed file`);
            console.log('First restaurant:', JSON.stringify(data[0], null, 2));
            
            const firstItem = data[0];
            const requiredFields = ['name', 'address', 'cuisine_type', 'is_kosher'];
            const missingFields = requiredFields.filter(field => !(field in firstItem));
            
            if (missingFields.length > 0) {
                console.error('Invalid restaurant data structure. Missing fields:', missingFields);
                return null;
            }
        }

        return data;
    } catch (error) {
        console.error('Error reading seed file:', error instanceof Error ? error.message : error);
        return null;
    }
}

async function initializeDatabase(isTest = false) {
    try {
        await createDatabase(isTest);

        const config = isTest ? testConfig : defaultConfig;
        const pool = new Pool(config);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS restaurants (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL UNIQUE,
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

        if (!isTest) {
            await pool.query('TRUNCATE restaurants RESTART IDENTITY CASCADE');
            const seedData = await loadSeedData();
            
            if (seedData && seedData.length > 0) {
                const values = seedData.map((_: any, index: number) => 
                    `($${index * 7 + 1}, $${index * 7 + 2}, $${index * 7 + 3}, $${index * 7 + 4}, $${index * 7 + 5}::jsonb, $${index * 7 + 6}, $${index * 7 + 7})`
                ).join(',');

                const flatParams = seedData.flatMap((r: any) => [
                    r.name,
                    r.address,
                    r.phone || null,
                    r.website || null,
                    JSON.stringify(r.opening_hours),
                    r.cuisine_type,
                    r.is_kosher
                ]);

                await pool.query(`
                    INSERT INTO restaurants (
                        name, address, phone, website, 
                        opening_hours, cuisine_type, is_kosher
                    ) 
                    VALUES ${values}
                    ON CONFLICT (name) DO NOTHING;
                `, flatParams);

                console.log(`Inserted ${seedData.length} restaurants from seed file`);
            } else {
                console.log('No seed data found. Database will be empty.');
            }
        }

        await pool.end();
        console.log(`Database initialization complete for ${isTest ? 'test' : 'development'} environment`);
    } catch (error) {
        console.error('Error during database initialization:', error);
        process.exit(1);
    }
}

const isTestEnv = process.env.NODE_ENV === 'test';
initializeDatabase(isTestEnv);