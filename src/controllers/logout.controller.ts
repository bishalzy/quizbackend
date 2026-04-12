const logoutController = (req: any, res: any) => {
    const token = req.cookies.token;

    if (!token) {
        return res.status(400).json({ error: 'No token provided' });
    }

    // Here you would typically invalidate the token in your database or token store
    // For example, you could delete the session associated with this token

    const isProduction = process.env.MODE === "production";
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

    res.clearCookie('token', cookieOptions);
    res.json({ message: 'Logged out successfully' });
}

export default logoutController;