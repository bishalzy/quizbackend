import express from "express";
import githubAuthController from "../controllers/githubauth.controller.js";
import logoutController from "../controllers/logout.controller.js";

const authRouter = express.Router();


authRouter.route('/github/logout').post(logoutController);
authRouter.route('/github/callback').get(githubAuthController);

export default authRouter;