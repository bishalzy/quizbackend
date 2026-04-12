

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

    const user = await userResponse.json();

    
};

const getUserEmail = async (token: string) => {
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