import express from "express";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import cors from "cors";
import questionRoute from "./routes/questionsRoute.js";
import authRouter from "./routes/authRoutes.js";

dotenv.config();

let allowedOrigins: string[] = [];
if (process.env.MODE === "production") {
  if (process.env.FRONTEND_URL) {
    allowedOrigins.push(process.env.FRONTEND_URL);
    allowedOrigins.push('/\.vercel\.app$/');
  }else{
    allowedOrigins.push("http://localhost:5173");
  }
}

const app = express();
app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));
app.use(cookieParser());

app.use(express.json());
app.use('/',questionRoute);
app.use('/auth',authRouter);
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});



export default app;
