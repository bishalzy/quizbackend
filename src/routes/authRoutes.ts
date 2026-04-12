import express from "express";
import githubAuthController from "../controllers/githubauth.controller.js";
import logoutController from "../controllers/logout.controller.js";
import loginController from "../controllers/auth.login.controller.js";
import checkAuthController from "../controllers/checkauth.controller.js";

const authRouter = express.Router();


authRouter.route('/github/logout').post(logoutController);
authRouter.route('/github/callback').get(githubAuthController);
authRouter.route('/github/login').get(loginController);
authRouter.route('/me').get(checkAuthController);

export default authRouter; 