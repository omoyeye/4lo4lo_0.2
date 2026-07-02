import { defineConfig } from "drizzle-kit";
import dotenv from "dotenv";
dotenv.config();

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.mysql.ts",
  dialect: "mysql",
  dbCredentials: {
    host: process.env.MYSQL_DB_HOST || "localhost",
    user: process.env.MYSQL_DB_USER || "root",
    password: process.env.MYSQL_DB_PASSWORD ?? "",
    database: process.env.MYSQL_DB_NAME || "growsocial",
  },
});
