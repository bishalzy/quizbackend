import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import questionRoute from "./routes/questionsRoute.js";
import githubAuthRouter from "./routes/authroutes.github.js";

dotenv.config();

const app = express();
app.use(cors());


app.use(express.json());
app.use('/',questionRoute);
app.use('/auth',githubAuthRouter);
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

export default app;