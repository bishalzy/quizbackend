export type Question = {
  type: "multiple" | "boolean"; 
  difficulty: "easy" | "medium" | "hard";
  category: string;
  question: string;
  correct_answer: string;
  incorrect_answers: string[];
};

export type QuestionsResponse = {
  response_code: number;
  results: Question[];
};  

export interface QuestionRequest {
  noofQuestion?: number;
  category?: number;
  difficulty?: string;
  type?: string;
}
