import type { userData } from "../utils/types/githubuserpayload.types.js";

const getUser = async (token: string) => {
    const userApiUrl = process.env.GITHUB_USER_API_URL || 'https://api.github.com/user';
    const userResponse = await fetch(userApiUrl, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
        }
    });

    if (!userResponse.ok) {
        throw new Error('Failed to fetch user data');
    }

    const {login,id,avatar_url} = await userResponse.json();

    return { login, id, avatar_url };
};

const getUserEmail = async (token: string):Promise<string> => {
    const emailApiUrl = process.env.GITHUB_EMAILS_API_URL || 'https://api.github.com/user/emails';
    const emailResponse = await fetch(emailApiUrl, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
        }
    });

    if (!emailResponse.ok) {
        throw new Error('Failed to fetch user email');
    }

    const emails = await emailResponse.json();

    const primaryEmail = emails.find((email: any) => email.primary)?.email;
    return primaryEmail || emails[0]?.email;
};


export { getUser, getUserEmail };