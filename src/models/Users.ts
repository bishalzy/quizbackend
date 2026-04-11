
import pool from "../db/db.js";
import type { User,Session } from "../utils/types/schema.types.js";

export const findOrCreateUser = async (githubToken: string, username: string, email: string): Promise<User> => {
  try {
    // Check if the user already exists
    const existingUserResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (existingUserResult.rows.length > 0) {
      return existingUserResult.rows[0] as User;
    }

    // If not, create a new user
    const insertResult = await pool.query(
      'INSERT INTO users (github_token, username, email) VALUES ($1, $2, $3) RETURNING *',
      [githubToken, username, email]
    );
    return insertResult.rows[0] as User;
  } catch (error) {
    console.error('Error in findOrCreateUser:', error);
    throw error;
  }
};