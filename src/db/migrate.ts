import fs from "fs";
import path from "path";
import pool from "./db.js";
import "dotenv/config";

const MIGRATIONS_DIR = path.join(process.cwd(), "src/db/migrations");

const runMigrations = async () => {
  const client = await pool.connect();

  try {
    //Prevent concurrent runs
    await client.query("SELECT pg_advisory_lock(123456)");

    // Ensure migrations table exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    const files = fs.readdirSync(MIGRATIONS_DIR).sort();

    for (const file of files) {
      const exists = await client.query(
        "SELECT 1 FROM migrations WHERE name = $1",
        [file]
      );

      if (exists.rowCount != null && exists.rowCount > 0) {
        console.log(`Skipping ${file}`);
        continue;
      }

      const sql = fs.readFileSync(
        path.join(MIGRATIONS_DIR, file),
        "utf-8"
      );

      console.log(`Running ${file}`);

      await client.query("BEGIN");
      await client.query(sql);
      await client.query(
        "INSERT INTO migrations (name) VALUES ($1)",
        [file]
      );
      await client.query("COMMIT");
    }

    console.log("Migrations complete");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Migration failed", err);
    process.exit(1);
  } finally {
    await client.query("SELECT pg_advisory_unlock(123456)");
    client.release();
  }
};

runMigrations();