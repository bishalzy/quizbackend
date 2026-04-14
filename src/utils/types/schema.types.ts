export interface User {
  id: number;
  github_id: string;
  username: string;
  email: string;
  avatar_url: string;
  created_at: Date;
}

export interface Session {
  id: number;
  user_id: number;
  token: string;
  created_at: Date;
}