import express from "express";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import cors from "cors";
import questionRoute from "./routes/questionsRoute.js";
import authRouter from "./routes/authRoutes.js";
import {EndpointsConfig} from "./utils/config/general.config.js";

dotenv.config();
const app = express();

let allowedOrigins: string[] = [];
if (process.env.MODE === "production") {
    allowedOrigins.push(EndpointsConfig.frontendUrl);
    allowedOrigins.push('/\.vercel\.app$/');

  } else {
    // dev mode
    allowedOrigins.push("http://localhost:5173");
  
}

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);

    // exact match (main frontend or localhost)
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // allow all Vercel preview deployments
    if (/\.vercel\.app$/.test(origin)) {
      return callback(null, true);
    }

    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true, // important if using cookies/auth
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));


app.use(cookieParser());

app.use(express.json());
app.use('/',questionRoute);
app.use('/auth',authRouter);
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});



export default app;
