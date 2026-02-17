import questions from "../services/questions.js";
import express from "express";

const getQuestions = async (req: express.Request, res: express.Response) => {
  try {
    const { noofQuestion, category, difficulty, type } = req.query;
    const response = await questions({ noofQuestion, category, difficulty, type });
    const data = await response.json();
    res.status(200).json(data);
  } catch (error:any) {
    res.status(500).json({ error: error.message });
  }
};

export default getQuestions;    