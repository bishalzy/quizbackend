
const EndpointsConfig = {
    frontendDomain: process.env.MODE === 'production' ? process.env.FRONTEND_DOMAIN : "localhost",
    frontendUrl: process.env.MODE === 'production' ? process.env.FRONTEND_URL : "http://localhost:5173",
    githubAuthUrl: process.env.GITHUB_AUTH_URL,
    githubTokenUrl: process.env.GITHUB_TOKEN_URL,
    githubUserApiUrl: process.env.GITHUB_USER_API_URL,
    githubEmailsApiUrl: process.env.GITHUB_EMAILS_API_URL
};

export  {EndpointsConfig};