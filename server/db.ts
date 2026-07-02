import mysql from "mysql2/promise";
import { drizzle } from "drizzle-orm/mysql2";
import * as schema from "@shared/schema.mysql";
import dotenv from "dotenv";
dotenv.config();

const required = (name: string): string => {
  const val = process.env[name];
  if (!val && val !== "") {
    throw new Error(`Environment variable ${name} is not set`);
  }
  return val ?? "";
};

// const pool = mysql.createPool({
//   host: process.env.MYSQL_DB_HOST || "localhost",
//   user: process.env.MYSQL_DB_USER || "root",
//   password: process.env.MYSQL_DB_PASSWORD ?? "",
//   database: process.env.MYSQL_DB_NAME || "growsocial",
//   waitForConnections: true,
//   connectionLimit: 20,
//   queueLimit: 0,
//   timezone: "Z",
//   charset: "utf8mb4",
// });

// pool
//   .getConnection()
//   .then((conn) => {
//     console.log("✔ MySQL connected successfully");
//     conn.release();
//   })
//   .catch((err: Error) => {
//     console.error("✗ MySQL connection error:", err.message);
//   });

// const db = drizzle(pool, { schema, mode: "default" });

const db = drizzle({ connection: { uri: process.env.DATABASE_URL } });

export { db };
