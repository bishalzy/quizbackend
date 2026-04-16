import { findUserById } from '../../models/Users.js';

const checkAuthController = async (req:any, res:any) => {
    

    const user = req.user;
    console.log('User from authGuardMiddleware:', user);
    if (!user) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
    console.log('User data from authGuardMiddleware:', user);
    const userData = await findUserById(user.user_id);

    if (!userData) {
        return res.status(404).json({ message: 'User not found' });
    }


    res.status(200).json(userData);  
}

export default checkAuthController;