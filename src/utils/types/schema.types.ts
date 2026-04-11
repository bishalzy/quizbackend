export interface User {
  id: number;
  github_token: string;
  username: string;
  email: string;
  created_at: Date;
}

export interface Session {
  id: number;
  user_id: number;
  token: string;
  created_at: Date;
}