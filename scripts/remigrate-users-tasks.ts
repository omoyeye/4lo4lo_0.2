/**
 * remigrate-users-tasks.ts
 * Retries migration for only the users and tasks tables
 * (after ALTER TABLE added the missing bio / difficulty columns).
 */
import pg from "pg";
import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

const { Pool } = pg;

async function main() {
  const pgPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  const mysqlConn = await mysql.createConnection({
    host: process.env.MYSQL_DB_HOST || "localhost",
    user: process.env.MYSQL_DB_USER || "root",
    password: process.env.MYSQL_DB_PASSWORD || "",
    database: process.env.MYSQL_DB_NAME || "growsocial",
    timezone: "Z",
  });

  const tables = ["users", "tasks"];

  for (const table of tables) {
    console.log(`\nRe-migrating: ${table}`);
    const { rows } = await pgPool.query(`SELECT * FROM "${table}" ORDER BY id`);
    if (rows.length === 0) { console.log("  No rows."); continue; }

    const cols = Object.keys(rows[0]);
    const escapedCols = cols.map((c) => `\`${c}\``).join(", ");
    const placeholders = cols.map(() => "?").join(", ");

    let ok = 0;
    for (const row of rows) {
      const values = cols.map((col) => {
        const v = row[col];
        if (v === null || v === undefined) return null;
        if (typeof v === "object" && !(v instanceof Date)) return JSON.stringify(v);
        return v;
      });
      try {
        await mysqlConn.execute(
          `INSERT INTO \`${table}\` (${escapedCols}) VALUES (${placeholders})
           ON DUPLICATE KEY UPDATE id = id`,
          values
        );
        ok++;
      } catch (err: unknown) {
        console.error(`  ✗ id=${row.id}: ${err instanceof Error ? err.message : err}`);
      }
    }

    // Reset AUTO_INCREMENT
    const [maxRow] = await mysqlConn.execute<mysql.RowDataPacket[]>(
      `SELECT COALESCE(MAX(id), 0) AS max_id FROM \`${table}\``
    );
    const maxId = (maxRow[0] as { max_id: number }).max_id;
    await mysqlConn.execute(`ALTER TABLE \`${table}\` AUTO_INCREMENT = ${maxId + 1}`);

    console.log(`  pg=${rows.length}  mysql_inserted=${ok}  ${rows.length === ok ? "✔ OK" : "✗ MISMATCH"}`);
  }

  await mysqlConn.end();
  await pgPool.end();
  console.log("\nDone.");
}

main().catch((e) => { console.error(e); process.exit(1); });
