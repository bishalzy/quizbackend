import express from "express";
import {getQuestions} from "../controllers/question.controller.js";
const questionsRoute = express.Router();

questionsRoute.route('/questions').get(getQuestions);


export default questionsRoute;