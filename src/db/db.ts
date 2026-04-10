import { Pool } from "pg";

const pool = new Pool({
  host: process.env.PGHOST,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
  port: parseInt(process.env.PGPORT || "5432"),
  ssl: {
    rejectUnauthorized: false, // For Azure PostgreSQL, SSL is required but we can skip certificate validation
  },
});

export default pool;