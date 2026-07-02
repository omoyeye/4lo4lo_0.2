import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.MYSQL_DB_HOST || "localhost",
    user: process.env.MYSQL_DB_USER || "root",
    password: process.env.MYSQL_DB_PASSWORD || "",
    database: process.env.MYSQL_DB_NAME || "growsocial",
  });

  // Check existing columns on users
  const [userCols] = await conn.execute<mysql.RowDataPacket[]>(`SHOW COLUMNS FROM users`);
  const userColNames = userCols.map((r: any) => r.Field);
  console.log("users columns:", userColNames.join(", "));

  if (!userColNames.includes("bio")) {
    await conn.execute("ALTER TABLE users ADD COLUMN bio TEXT");
    console.log("✔ Added bio to users");
  } else {
    console.log("bio already exists in users");
  }

  // Check existing columns on tasks
  const [taskCols] = await conn.execute<mysql.RowDataPacket[]>(`SHOW COLUMNS FROM tasks`);
  const taskColNames = taskCols.map((r: any) => r.Field);
  console.log("tasks columns:", taskColNames.join(", "));

  if (!taskColNames.includes("difficulty")) {
    await conn.execute("ALTER TABLE tasks ADD COLUMN difficulty VARCHAR(50)");
    console.log("✔ Added difficulty to tasks");
  } else {
    console.log("difficulty already exists in tasks");
  }

  await conn.end();
  console.log("Done.");
}

main().catch((e) => { console.error(e); process.exit(1); });
