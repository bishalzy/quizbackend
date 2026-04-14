
import pool from "../db/db.js";
import type { User,Session } from "../utils/types/schema.types.js";

export const findOrCreateUser = async (github_id: number, username: string,email: string, avatar_url: string): Promise<User> => {
  try {
    // Check if the user already exists
    const existingUserResult = await pool.query('SELECT * FROM users WHERE github_id = $1', [github_id]);
    if (existingUserResult.rows.length > 0) {
      return existingUserResult.rows[0] as User;
    }

    // If not, create a new user
    const insertResult = await pool.query(
      'INSERT INTO users (github_id, username, email, avatar_url) VALUES ($1, $2, $3, $4) RETURNING *',
      [github_id, username, email, avatar_url]
    );
    return insertResult.rows[0] as User;
  } catch (error) {
    console.error('Error in findOrCreateUser:', error);
    throw error;
  }
};
//TODO need to regenerage the token if collision happens
export const createSession = async (user_id: number, refresh_token: string): Promise<Session> => {
  try {
    const existingSessionResult = await pool.query('SELECT * FROM sessions WHERE refresh_token = $1', [refresh_token]);
    if (existingSessionResult.rows.length > 0) {
      return existingSessionResult.rows[0] as Session;
    }
    const insertResult = await pool.query(
      'INSERT INTO sessions (user_id, refresh_token) VALUES ($1, $2) RETURNING *',
      [user_id, refresh_token]
    );
    return insertResult.rows[0] as Session;
  } catch (error) {
    console.error('Error in createSession:', error);
    throw error;
  }
};

export const findSessionByToken = async (refresh_token: string): Promise<Session | null> => {
  try {
    const result = await pool.query('SELECT * FROM sessions WHERE refresh_token = $1', [refresh_token]);
    if (result.rows.length > 0) {
      return result.rows[0] as Session;
    }
    return null;
  } catch (error) {
    console.error('Error in findSessionByToken:', error);
    throw error;
  }
};

export const deleteSession = async (token: string): Promise<void> => {
  try {
    await pool.query('DELETE FROM sessions WHERE refresh_token = $1', [token]);
  } catch (error) {
    console.error('Error in deleteSession:', error);
    throw error;
  }
};  