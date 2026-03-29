import fetch from "node-fetch";

import { questionsConfig } from "./questionsConfig.ts";
import type { QuestionRequest }  from "../utils/types/questionTypes.ts";



const questions = (Question: QuestionRequest) => {
  const { noofQuestion,category, difficulty, type } = Question;
  const totalQuestion = noofQuestion || 4;
  const defaultType = type || "multiple";

  if (category && !questionsConfig.category.includes(category)) {
    throw new Error("Invalid category");
  }
  if (difficulty && !questionsConfig.difficulty.includes(difficulty)) {
    throw new Error("Invalid difficulty");
  }
  if (type && !questionsConfig.type.includes(type)) {
    throw new Error("Invalid type");
  }
  // console.log(process.env.BASE_QUESTION_URL);
  const baseUrl = process.env.BASE_QUESTION_URL || "https://opentdb.com/api.php?amount=";

  const url=`${baseUrl}${totalQuestion}${category?`&category=${category}`:""}${difficulty?`&difficulty=${difficulty}`:""}${`&type=${defaultType}`}`;

  return fetch(url);

};

export default questions;