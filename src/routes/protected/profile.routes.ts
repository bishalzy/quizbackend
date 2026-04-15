import express from 'express';
import refreshController from '../../controllers/protected/refresh.controller.js';
import profileController from '../../controllers/protected/profile.controller.js';
import logoutController from '../../controllers/protected/logout.controller.js';
import checkAuthController from '../../controllers/protected/checkauth.controller.js';


const profileRouter = express.Router();

profileRouter.get('/profile', profileController);

profileRouter.get('/profile/gamehistory',(req, res) => {
    res.status(200).json({ message: 'User game history data' });
});

profileRouter.route('/logout').post( logoutController);

profileRouter.route('/me').get(checkAuthController);

profileRouter.route('/refresh').get(refreshController);


export default profileRouter;