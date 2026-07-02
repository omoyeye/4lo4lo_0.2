/**
 * sync-schema-and-migrate.ts
 *
 * 1. Reads the ACTUAL column list from Neon for each target table
 * 2. Checks what columns are missing in MySQL
 * 3. ALTERs MySQL to add any missing columns (as TEXT/VARCHAR/INT based on PG type)
 * 4. Then re-inserts all rows from Neon into MySQL using ON DUPLICATE KEY UPDATE id=id
 *
 * This handles any hidden/extra columns that exist in the live DB but not in schema.ts
 */

import pg from "pg";
import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

const { Pool } = pg;

// Map PG data type to a safe MySQL column type
function pgToMysqlType(pgType: string): string {
  switch (pgType.toLowerCase()) {
    case "integer": case "int4": case "int2": case "int8": case "bigint": return "INT";
    case "boolean": case "bool": return "TINYINT(1)";
    case "numeric": case "decimal": case "float4": case "float8": case "double precision": return "DECIMAL(15,4)";
    case "timestamp": case "timestamp without time zone": case "timestamp with time zone": return "DATETIME";
    case "date": return "DATE";
    case "json": case "jsonb": return "JSON";
    case "text": return "TEXT";
    case "character varying": case "varchar": return "VARCHAR(255)";
    default: return "TEXT"; // safe fallback
  }
}

async function main() {
  const tables = ["users", "tasks"];

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

  for (const table of tables) {
    console.log(`\n===== ${table} =====`);

    // Get PG columns
    const { rows: pgCols } = await pgPool.query(
      `SELECT column_name, data_type FROM information_schema.columns
       WHERE table_name = $1 AND table_schema = 'public'
       ORDER BY ordinal_position`,
      [table]
    );
    const pgColMap: Record<string, string> = {};
    for (const col of pgCols) pgColMap[col.column_name] = col.data_type;
    console.log(`PG columns (${pgCols.length}):`, Object.keys(pgColMap).join(", "));

    // Get MySQL columns
    const [mysqlCols] = await mysqlConn.execute<mysql.RowDataPacket[]>(
      `SHOW COLUMNS FROM \`${table}\``
    );
    const mysqlColNames = new Set(mysqlCols.map((r: any) => r.Field as string));
    console.log(`MySQL columns (${mysqlColNames.size}):`, [...mysqlColNames].join(", "));

    // Find missing columns
    const missing = Object.entries(pgColMap).filter(([col]) => !mysqlColNames.has(col));
    if (missing.length === 0) {
      console.log("  ✔ No missing columns.");
    } else {
      console.log(`  Adding ${missing.length} missing column(s):`);
      for (const [col, pgType] of missing) {
        const mysqlType = pgToMysqlType(pgType);
        await mysqlConn.execute(`ALTER TABLE \`${table}\` ADD COLUMN \`${col}\` ${mysqlType}`);
        console.log(`  ✔ Added \`${col}\` ${mysqlType} (pg: ${pgType})`);
      }
    }

    // Now insert all rows
    const { rows } = await pgPool.query(`SELECT * FROM "${table}" ORDER BY id`);
    if (rows.length === 0) { console.log("  No rows to insert."); continue; }

    const cols = Object.keys(rows[0]);
    const escapedCols = cols.map((c) => `\`${c}\``).join(", ");
    const placeholders = cols.map(() => "?").join(", ");

    let ok = 0;
    let skip = 0;
    for (const row of rows) {
      const values = cols.map((col) => {
        const v = row[col];
        if (v === null || v === undefined) return null;
        if (typeof v === "object" && !(v instanceof Date)) return JSON.stringify(v);
        return v;
      });
      try {
        const [result] = await mysqlConn.execute<mysql.ResultSetHeader>(
          `INSERT INTO \`${table}\` (${escapedCols}) VALUES (${placeholders})
           ON DUPLICATE KEY UPDATE id = id`,
          values
        );
        if (result.affectedRows > 0) ok++;
        else skip++; // already existed
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

    // Verify
    const [countRow] = await mysqlConn.execute<mysql.RowDataPacket[]>(
      `SELECT COUNT(*) AS cnt FROM \`${table}\``
    );
    const mysqlCount = (countRow[0] as { cnt: number }).cnt;

    const match = rows.length === mysqlCount;
    console.log(
      `  pg=${rows.length}  mysql=${mysqlCount}  new=${ok}  already_existed=${skip}  ${match ? "✔ OK" : "✗ MISMATCH"}`
    );
  }

  await mysqlConn.end();
  await pgPool.end();
  console.log("\n✅ Done!");
}

main().catch((e) => { console.error("Fatal:", e); process.exit(1); });
