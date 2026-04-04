import express from "express";
import githubAuthController from "../controllers/githubauth.controller.js";


const githubAuthRouter = express.Router();

githubAuthRouter.route('/github').get(githubAuthController);

export default githubAuthRouter;