import { findSessionByToken,deleteSession } from "../../models/Users.js";



const logoutController = async (req: any, res: any) => {

    const accessToken = req.cookies.access_token;
    const refreshToken = req.cookies.refresh_token;
    const isProduction = process.env.MODE === "production";

    if (!accessToken && !refreshToken) {
        return res.status(400).json({ error: 'No tokens provided' });
    }

    const session = await findSessionByToken(refreshToken);
    if (session) {
        await deleteSession(session.token);
    }

    
    const frontendUrl = isProduction
        ? process.env.FRONTEND_DOMAIN
        : "http://localhost:5173";

    const cookieOptions: any = {
        httpOnly: true,
        secure: isProduction,
        sameSite: "lax"
    };

    if (isProduction && frontendUrl) {
        cookieOptions.domain = new URL(frontendUrl).hostname;
    }

    res.clearCookie('access_token', cookieOptions);
    res.clearCookie('refresh_token', cookieOptions);

    res.status(200).json({ message: 'Logged out successfully' });
}

export default logoutController;