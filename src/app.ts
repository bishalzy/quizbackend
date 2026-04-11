import express from "express";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import cors from "cors";
import questionRoute from "./routes/questionsRoute.js";
import authRouter from "./routes/authRoutes.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(cookieParser());

app.use(express.json());
app.use('/',questionRoute);
app.use('/auth',authRouter);
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});



export default app;