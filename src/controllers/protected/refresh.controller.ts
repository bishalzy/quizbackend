import {cookieOptions} from "../../utils/config/cookieOption.config.js";
import { generateAccessToken } from "../../utils/token/generateToken.js";
import { findUserById } from "../../models/Users.js";
import { verifyRefreshToken } from "../../utils/token/verifyToken.js";

const refreshController = async (req: any, res: any) => {

    try{
        const refreshToken = req.cookies.refresh_token;
        if (!refreshToken) {
            res.clearCookie('access_token');
            res.clearCookie('refresh_token');
            return res.status(401).json({ error: 'No refresh token provided' });
        }
        const session = await verifyRefreshToken(refreshToken);
        if (!session) {
            res.clearCookie('access_token');
            res.clearCookie('refresh_token');
            return res.status(401).json({ error: 'Invalid refresh token' });
        }
        const user = await findUserById(session.user_id);
        if (!user) {
            res.clearCookie('access_token');
            res.clearCookie('refresh_token');
            return res.status(401).json({ error: 'User not found' });
        }
        const newAccessToken = generateAccessToken({ user_id: session.user_id , session_id: session.id , username: user.username });
        res.cookie('access_token', newAccessToken, cookieOptions);

        res.status(200).json({ message: 'Access token refreshed successfully' });

    } catch (error) {
        res.clearCookie('access_token');
        res.clearCookie('refresh_token');
        res.status(401).json({ message: 'Session expired. Please log in again.' });
    }

};

export default refreshController;