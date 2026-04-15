import express from "express";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import cors from "cors";
import questionRoute from "./routes/questionsRoute.js";
import authRouter from "./routes/authRoutes.js";
import profileRouter from "./routes/protected/profile.routes.js";
import authGuardMiddleware from "./middleware/authGuard.middleware.js";
import {EndpointsConfig} from "./utils/config/general.config.js";

dotenv.config();
const app = express();

let allowedOrigins: string[] = [];
if (process.env.MODE === "production") {
    allowedOrigins.push(EndpointsConfig.frontendUrl);
    allowedOrigins.push('/\.vercel\.app$/');
  } else {
    allowedOrigins.push("http://localhost:5173");
}

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    // allow all Vercel deployments
    if (/\.vercel\.app$/.test(origin)) {
      return callback(null, true);
    }
    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(cookieParser());

app.use(express.json());
app.use('/api',questionRoute);
app.use('/auth',authRouter);
app.use('/user',authGuardMiddleware,profileRouter);
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

export default app;
