import express from 'express';
import authGuardMiddleware from '../../middleware/authGuard.middleware.js';
import logoutController from '../../controllers/protected/logout.controller.js';

const profileRouter = express.Router();

profileRouter.get('/profile', authGuardMiddleware, (req, res) => {
    // Handle the GET request for the profile endpoint
});

profileRouter.get('/profile/gamehistory', authGuardMiddleware, (req, res) => {
    // Handle the GET request for the game history endpoint
});
profileRouter.route('/github/logout').post(logoutController);

profileRouter.route('/refresh').get((req, res) => {
    // Handle the GET request for the token refresh endpoint
});


export default profileRouter;