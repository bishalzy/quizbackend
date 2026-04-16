
import { getUser, getUserEmail } from "../services/github.service.js";
import { cookieOptions,refreshTokenCookieOptions } from "../utils/config/cookieOption.config.js";
import {EndpointsConfig} from "../utils/config/general.config.js";
import { generateRefreshToken,generateAccessToken } from "../utils/token/generateToken.js";
import { findOrCreateUser,createSession } from "../models/Users.js";
import type{GithubTokenResponse} from "../utils/types/githubuserpayload.types.js";


const githubAuthController = async (req:any, res:any) =>{
    const code = req.query.code;

    if (!code) {
        return res.redirect(EndpointsConfig.frontendUrl);
    }
    try{
        const client_id = process.env.GITHUB_CLIENT_ID;
        const client_secret = process.env.GITHUB_CLIENT_SECRET;

        if (!client_id || !client_secret) {
            return res.status(500).json({ error: 'Missing GitHub OAuth configuration' });
        }
        
        const tokenResponse = await fetch(EndpointsConfig.githubTokenUrl || "https://github.com/login/oauth/access_token", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                client_id,
                client_secret,
                code
            })
        });

        const tokenData: GithubTokenResponse = await tokenResponse.json();


        // console.log('GitHub token response:', tokenData);
        if (!tokenResponse.ok || tokenData.error) {
            return res.status(400).json({ error: 'Invalid code' });
        }

        const accessToken = tokenData.access_token;
        
        const user = await getUser(accessToken);
        const email = await getUserEmail(accessToken);

        const dbUser = await findOrCreateUser(user.id, user.login,email,user.avatar_url);
        const refreshToken = generateRefreshToken();
        const session = await createSession(dbUser.id , refreshToken);
        const accessTokenJwt = generateAccessToken({ session_id: session.id, user_id: dbUser.id, username: dbUser.username });

        res.cookie("access_token", accessTokenJwt, cookieOptions);
        res.cookie("refresh_token", refreshToken, refreshTokenCookieOptions);
        res.redirect(EndpointsConfig.frontendUrl);    // Redirect to frontend after successful authentication

    } catch (error) {
        console.error('Error fetching GitHub token:', error);
        res.status(500).json({ error: 'Failed to fetch GitHub token' });
    }
}

export default githubAuthController;