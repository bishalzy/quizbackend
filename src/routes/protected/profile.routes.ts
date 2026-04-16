import express from 'express';
import refreshController from '../../controllers/protected/refresh.controller.js';
import profileController from '../../controllers/protected/profile.controller.js';
import logoutController from '../../controllers/protected/logout.controller.js';
import checkAuthController from '../../controllers/protected/checkauth.controller.js';
import gameHistoryController from '../../controllers/protected/gamehistory.controller.js';

const profileRouter = express.Router();

profileRouter.get('/profile', profileController);

profileRouter.route('/logout').post( logoutController);

profileRouter.route('/me').get(checkAuthController);

profileRouter.route('/refresh').get(refreshController);

profileRouter.route('/gamehistory').get(gameHistoryController);


export default profileRouter;