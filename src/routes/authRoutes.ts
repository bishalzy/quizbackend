import express from "express";
import githubAuthController from "../controllers/githubauth.controller.js";
import loginController from "../controllers/auth.login.controller.js";
import refreshController from "../controllers/protected/refresh.controller.js";
import refreshMiddleware from "../middleware/refresh.middleware.js";

const authRouter = express.Router();



authRouter.route('/github/callback').get(githubAuthController);
authRouter.route('/github/login').get(loginController);
authRouter.route('/refresh').get(refreshMiddleware, refreshController);

export default authRouter; 