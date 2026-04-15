

const checkAuthController = (req:any, res:any) => {
    

    const user = req.user; // Assuming the user information is stored in req.user by the authentication middleware

    if (!user) {
        return res.status(401).json({ message: 'Unauthorized' });
    }


    res.status(200).json(user);  
}

export default checkAuthController;