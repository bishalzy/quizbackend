import express from "express";
import dotenv from "dotenv";
import cors from "cors";

import questionRoute from "./routes/questionsRoute.ts";
dotenv.config();

const app = express();
app.use(cors());


app.use(express.json());
app.use('/',questionRoute);




app.listen(process.env.PORT || 5000, () => {
  console.log(`Server is running on port ${process.env.PORT || 5000}`);
});
