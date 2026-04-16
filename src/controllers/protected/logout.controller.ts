import { findSessionByToken,deleteSession } from "../../models/Users.js";

import { cookieOptions } from "../../utils/config/cookieOption.config.js";


const logoutController = async (req: any, res: any) => {

    const accessToken = req.cookies.access_token;
    const refreshToken = req.cookies.refresh_token;

    if (!accessToken && !refreshToken) {
        return res.status(400).json({ error: 'No tokens provided' });
    }

    const session = await findSessionByToken(refreshToken);
    if (!session) {
        return res.status(400).json({ error: 'Invalid refresh token' });
    }

    await deleteSession(session.id);

    res.clearCookie('access_token', cookieOptions);
    res.clearCookie('refresh_token', cookieOptions);

    res.status(200).json({ message: 'Logged out successfully' });
}

export default logoutController;