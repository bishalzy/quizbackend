import questionsService from "../services/questins.service.js";
import type { QuestionsResponse, QuestionRequest } from "../utils/types/questionTypes.js";
import express from "express";
import { Response } from "node-fetch";







const getQuestions = async (req: express.Request, res: express.Response) => {
  try {
    const asSingleString = (value: unknown): string | undefined => {
      if (typeof value === "string") return value;
      if (Array.isArray(value) && typeof value[0] === "string") return value[0];
      return undefined;
    };

    const parseOptionalInt = (value: unknown): number | undefined => {
      const str = asSingleString(value);
      if (!str) return undefined;
      const parsed = Number.parseInt(str, 10);
      if (Number.isNaN(parsed)) {
        throw new Error(`Invalid number: ${str}`);
      }
      return parsed;
    };

    const noofQuestion = parseOptionalInt(req.query.noofQuestion);
    const category = parseOptionalInt(req.query.category);
    const difficulty = asSingleString(req.query.difficulty);
    const type = asSingleString(req.query.type);

    const params: QuestionRequest = {};
    if (noofQuestion !== undefined) params.noofQuestion = noofQuestion;
    if (category !== undefined) params.category = category;
    if (difficulty !== undefined) params.difficulty = difficulty;
    if (type !== undefined) params.type = type;

    const response:Response = await questionsService(params);
    const data = await response.json() as QuestionsResponse;
    console.log(data.results);
    res.status(200).json(data);
  } catch (error:any) {
    res.status(500).json({ error: error.message });
  } finally {
    console.log( "Request completed for getQuestions" );
  }
};

export { getQuestions };    