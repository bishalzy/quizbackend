import express from "express";
import githubAuthController from "../controllers/githubauth.controller.js";
import loginController from "../controllers/auth.login.controller.js";

const authRouter = express.Router();



authRouter.route('/github/callback').get(githubAuthController);
authRouter.route('/github/login').get(loginController);

export default authRouter; 