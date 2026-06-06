

const refreshMiddleware = (req: any, res: any, next: any) => {
    const refreshToken = req.cookies.refresh_token;
    // console.log('Refresh token received in refreshMiddleware:', refreshToken??'No refresh token');
    if (!refreshToken) {
        return res.status(401).json({ error: 'Refresh token missing' });
    }
    next();
};

export default refreshMiddleware;