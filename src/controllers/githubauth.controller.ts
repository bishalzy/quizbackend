import generateToken from "../utils/generateToken.js";
import { getUser, getUserEmail } from "../services/github.service.js";
import {EndpointsConfig} from "../utils/config/general.config.js";
import type{GithubTokenResponse} from "../utils/types/githubpayload.types.js";
import { endianness } from "os";

const githubAuthController = async (req:any, res:any) =>{
    const code = req.query.code;

    if (!code) {
        return res.status(400).json({ error: "Missing OAuth code. Use /auth/github/callback?code=..." });
    }

    try{
        const client_id = process.env.GITHUB_CLIENT_ID;
        const client_secret = process.env.GITHUB_CLIENT_SECRET;
        const isProduction = process.env.MODE === "production";

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
        
        getUser(accessToken).then(user => {
            console.log('GitHub user data:', user);
        }).catch(err => {
            console.error('Error fetching GitHub user data:', err);
        });
        
        getUserEmail(accessToken).then(email => {
            console.log('GitHub user email:', email);
        }).catch(err => {
            console.error('Error fetching GitHub user email:', err);
        });
        const jwtToken = generateToken({ accessToken });

        const cookieOptions: any = {
            httpOnly: true,
            secure: isProduction,
            sameSite: "lax"
        };


        cookieOptions.domain = EndpointsConfig.frontendDomain;
        

        res.cookie("token", jwtToken, cookieOptions);
        console.log(EndpointsConfig.frontendUrl);
        res.redirect(EndpointsConfig.frontendUrl);    // Redirect to frontend after successful authentication

    } catch (error) {
        console.error('Error fetching GitHub token:', error);
        res.status(500).json({ error: 'Failed to fetch GitHub token' });
    }
}

export default githubAuthController;