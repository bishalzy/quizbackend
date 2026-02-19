import express from "express";
import {getQuestions} from "../controllers/questionsController.ts";
const questionsRoute = express.Router();

questionsRoute.route('/api/questions').get(getQuestions);


export default questionsRoute;