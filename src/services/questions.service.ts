import fetch from "node-fetch";

import { questionsConfig } from "../utils/config/questionsConfig.js";
import type { QuestionRequest }  from "../utils/types/questionTypes.js";



const questionsService = (Question: QuestionRequest) => {
  const { noofQuestion,category, difficulty, type } = Question;
  const totalQuestion = noofQuestion || 10;
  const defaultType = type || "multiple";
  const defaultCategory = category || 18; // default to computer science category

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
  const baseUrl = process.env.BASE_QUESTION_URL || "https://opentdb.com/api.php";

  const url=`${baseUrl}?amount=${totalQuestion}${`&category=${defaultCategory}`}${difficulty?`&difficulty=${difficulty}`:""}${`&type=${defaultType}`}`;

  return fetch(url);

};

export default questionsService;