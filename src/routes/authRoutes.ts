import express from "express";
import githubAuthController from "../controllers/githubauth.controller.js";
import loginController from "../controllers/auth.login.controller.js";
import checkAuthController from "../controllers/protected/checkauth.controller.js";

const authRouter = express.Router();



authRouter.route('/github/callback').get(githubAuthController);
authRouter.route('/github/login').get(loginController);
authRouter.route('/me').get(checkAuthController);

export default authRouter; 