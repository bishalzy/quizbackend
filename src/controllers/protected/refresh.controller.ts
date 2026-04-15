import {cookieOptions} from "../../utils/config/cookieOption.config.js";
import { generateAccessToken } from "../../utils/token/generateToken.js";
import { findUserById } from "../../models/Users.js";
import { verifyRefreshToken } from "../../utils/token/verifyToken.js";

const refreshController = async (req: any, res: any) => {

    try{
        const refreshToken = req.cookies.refresh_token;

        if (!refreshToken) {
            return res.status(400).json({ error: 'No refresh token provided' });
        }
        const session = await verifyRefreshToken(refreshToken);
        if (!session) {
            return res.status(401).json({ error: 'Invalid refresh token' });
        }
        const user = await findUserById(session.user_id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        const newAccessToken = generateAccessToken({ user_id: session.user_id , session_id: session.id , username: user.username });
        res.cookie('access_token', newAccessToken, cookieOptions);

        res.status(200).json({ message: 'Access token refreshed successfully' });

    } catch (error) {
        console.error('Error in refreshController:', error);
        res.status(500).json({ message: 'Internal server error' });
    }

};

export default refreshController;