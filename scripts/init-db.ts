import pool from '../src/db/connection';
import { promises as fs } from 'fs';
import path from 'path';

async function initializeDatabase() {
  try {
    const migrationsPath = path.join(__dirname, '../src/db/migrations');
    const files = await fs.readdir(migrationsPath);
    
    for (const file of files.sort()) {
      const sql = await fs.readFile(path.join(migrationsPath, file), 'utf8');
      await pool.query(sql);
      console.log(`Executed ${file}`);
    }
    
    console.log('Database initialization complete');
    process.exit(0);
  } catch (error) {
    console.error('Error initializing database:', error);
    process.exit(1);
  }
}

initializeDatabase();