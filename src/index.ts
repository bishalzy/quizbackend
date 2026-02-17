import express from "express";
import dotenv from "dotenv";

dotenv.config();

const app = express();

app.get("/", (req: express.Request, res: express.Response) => {
  res.send("Hello World");
});

app.listen(process.env.PORT || 5000, () => {
  console.log(`Server is running on port ${process.env.PORT || 5000}`);
});
