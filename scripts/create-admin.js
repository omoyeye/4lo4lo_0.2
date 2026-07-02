// Script to create initial admin user
import crypto from 'crypto';
import { promisify } from 'util';
import { Pool } from '@neondatabase/serverless';
import ws from 'ws';

// For password hashing
const scryptAsync = promisify(crypto.scrypt);

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const buf = await scryptAsync(password, salt, 64);
  return `${buf.toString('hex')}.${salt}`;
}

async function createAdmin() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not set');
    process.exit(1);
  }

  // Setup websocket for Neon
  global.WebSocket = ws;
  
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  // Create admin account
  const username = 'admin';
  const password = 'Admin@123'; // Change this to a secure password
  const email = 'admin@example.com';
  const role = 'superadmin';
  
  // Hash the password
  const hashedPassword = await hashPassword(password);
  
  try {
    // Check if admin already exists
    const { rows: existingAdmins } = await pool.query(
      'SELECT * FROM admins WHERE username = $1',
      [username]
    );
    
    if (existingAdmins.length > 0) {
      console.log('Admin already exists:', existingAdmins[0].id);
      await pool.end();
      return;
    }
    
    // Insert new admin
    const { rows } = await pool.query(
      `INSERT INTO admins 
      (username, password, email, role, status, created_at, updated_at) 
      VALUES ($1, $2, $3, $4, $5, $6, $7) 
      RETURNING id, username, email, role, status, created_at`,
      [
        username,
        hashedPassword,
        email,
        role,
        'active',
        new Date(),
        new Date()
      ]
    );
    
    console.log('Admin created successfully:', rows[0]);
  } catch (error) {
    console.error('Error creating admin:', error);
  } finally {
    await pool.end();
  }
}

createAdmin().catch(console.error);