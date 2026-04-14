

export type GithubTokenResponse = {
  access_token: string;
  token_type: string;
  scope: string;
  error?: any;
}

export type userData = {
  login: string;
  id: number;
  avatar_url: string;
  email: string;
};
