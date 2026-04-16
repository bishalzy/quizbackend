import { findUserById } from "../../models/Users.js";

const profileController = async (req: any, res: any) => {

    const user = req.user;
    if (!user) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
    try{
        const userData = await findUserById(user.user_id);
        if(!userData){
            return res.status(404).json({ message: 'User not found' });
        }
        console.log('User data retrieved successfully:', userData);
        res.status(200).json(userData);
    } catch (error) {
        console.error('Error in profileController:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
}

export default profileController;