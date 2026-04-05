

export type GithubTokenResponse = {
  access_token: string;
  token_type: string;
  scope: string;
}

export type GithubUserResponse = {
  login: string;
  id: number;
  avatar_url: string;
  html_url: string;
  name: string;
  company: string | null;
  blog: string | null;
  location: string | null;
  email: string | null;
  bio: string | null;
};

export type GithubAuthRequest = {
  code: string;
};

export type GithubAuthResponse = {
  token: string;
  user: GithubUserResponse;
};