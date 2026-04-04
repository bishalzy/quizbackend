import express from "express";
import dotenv from "dotenv";
import cors from "cors";

import questionRoute from "./routes/questionsRoute.js";
dotenv.config();

const app = express();
app.use(cors());


app.use(express.json());
app.use('/',questionRoute);


export default app;