import express from "express";
import cors from "cors";


import userRouter from "./src/routes/user.routes.js";
import postRouter from "./src/routes/post.routes.js";
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


app.use("/api/v1/users", userRouter);
app.use("/api/v1/posts", postRouter);


export { app };
