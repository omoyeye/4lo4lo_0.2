import pkg from 'pg';
import { scrypt, randomBytes } from 'crypto';
import { promisify } from 'util';

const { Pool } = pkg;
const scryptAsync = promisify(scrypt);

async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const buf = await scryptAsync(password, salt, 64);
  return `${buf.toString('hex')}.${salt}`;
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  const client = await pool.connect();
  try {
    const hash = await hashPassword('Admin@2024!');

    // Upsert admin (insert or ignore if already exists)
    const res = await client.query(`
      INSERT INTO admins (username, password, email, role, status)
      VALUES ('admin', $1, '4lo4lo.site@gmail.com', 'superadmin', 'active')
      ON CONFLICT (username) DO UPDATE
        SET password = EXCLUDED.password,
            email = EXCLUDED.email,
            role = EXCLUDED.role
      RETURNING id, username, role
    `, [hash]);

    console.log('✅ Admin seeded:', res.rows[0]);

    // Also seed default app settings
    const settings = [
      ['promote_me_enabled', 'true', 'Enable/disable Promote Me feature'],
      ['classroom_enabled', 'true', 'Enable/disable Classroom feature'],
      ['maintenance_mode', 'false', 'Enable/disable maintenance mode'],
      ['registration_enabled', 'true', 'Allow new user registrations'],
    ];

    for (const [key, value, description] of settings) {
      await client.query(`
        INSERT INTO app_settings (key, value, description)
        VALUES ($1, $2, $3)
        ON CONFLICT (key) DO NOTHING
      `, [key, value, description]);
    }
    console.log('✅ Default app settings seeded');

  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
