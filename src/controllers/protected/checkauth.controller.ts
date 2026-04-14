

const checkAuthController = (req:any, res:any) => {
    const token = req.cookies.token;

    if (!token) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    // Here you would typically verify the token and retrieve user information
    // For example, you could decode the JWT token and check its validity

    res.json({ message: 'Authenticated'});  
}

export default checkAuthController;