import generateToken from "../utils/generateToken.js";
import generalConfig from "../utils/config/general.config.js";


const githubAuthController = async (req:any, res:any) =>{
    const code = req.query.code;

    try{
        const client_id = process.env.GITHUB_CLIENT_ID;
        const client_secret = process.env.GITHUB_CLIENT_SECRET;
        const githubTokenUrl = process.env.GITHUB_TOKEN_URL;

        if (!client_id || !client_secret || !githubTokenUrl) {
            return res.status(500).json({ error: 'Missing GitHub OAuth configuration' });
        }
        
        const tokenResponse = await fetch(githubTokenUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                client_id,
                client_secret,
                code
            })
        });
        const tokenData = await tokenResponse.json();

        if (tokenData.error) {
            return res.status(400).json({ error: 'Invalid code' });
        }

        const accessToken = tokenData.access_token;
        const jwtToken = generateToken({ accessToken });

        res.cookie("token", jwtToken, { httpOnly: true, secure: true, sameSite: 'lax', domain: generalConfig.frontendDomain });
        res.redirect(generalConfig.frontendDomain);    // Redirect to your frontend URL after successful authentication
    } catch (error) {
        console.error('Error fetching GitHub token:', error);
        res.status(500).json({ error: 'Failed to fetch GitHub token' });
    }
}

export default githubAuthController;