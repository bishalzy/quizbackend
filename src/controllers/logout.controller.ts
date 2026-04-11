

const logoutController = (req: any, res: any) => {
    const token = req.cookies.token;

    if (!token) {
        return res.status(400).json({ error: 'No token provided' });
    }

    // Here you would typically invalidate the token in your database or token store
    // For example, you could delete the session associated with this token

    res.clearCookie('token', { httpOnly: true, secure: true, sameSite: 'lax', domain: generalConfig.frontendDomain });
    res.json({ message: 'Logged out successfully' });
}

export default logoutController;